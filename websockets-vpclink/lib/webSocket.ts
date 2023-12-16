import {Construct} from "constructs";
import {NetworkListener, NetworkLoadBalancer, NetworkTargetGroup} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import {CfnVpcLink} from "aws-cdk-lib/aws-apigateway";
import {
    CfnApi,
    CfnIntegration,
    CfnIntegrationResponse,
    CfnRoute,
    CfnRouteResponse,
    CfnStage
} from "aws-cdk-lib/aws-apigatewayv2";
import {Effect, PolicyStatement} from "aws-cdk-lib/aws-iam";
import {CfnOutput, Duration, Stack} from "aws-cdk-lib";
import {WebSocketProps} from "./webSocketProps";
import {Port} from "aws-cdk-lib/aws-ec2";
import {WebSocketAuthorizer} from "./webSocketAuthorizer";

export class WebSocket extends Construct {
    public listener: NetworkListener;
    private nlb: NetworkLoadBalancer;

    constructor(scope: Construct, id: string, props: WebSocketProps) {
        super(scope, id);

        this.nlb = new NetworkLoadBalancer(this, 'api-nlb', {
            vpc: props.vpc,
            internetFacing: false,
            loadBalancerName: 'api-nlb',
            vpcSubnets: {subnetGroupName: "Private"}
        });

        const port = 80;

        this.listener = this.nlb.addListener('api-listener-nlb', {
            port: port
        });

        const vpcNlbLink = new CfnVpcLink(this, "vpc-link-nlb", {
            name: "vpc-link-nlb",
            description: 'vpc link for web sockets private integration',
            targetArns: [this.nlb.loadBalancerArn]
        });

        const targetGroupNlb = this.listener.addTargets('handler-nlb-group', {
            targetGroupName: 'handler-nlb-target',
            port: port,
            targets: [props.fargateService],
            healthCheck: {
                port: port.toString(),
                interval: Duration.seconds(60),
                timeout: Duration.seconds(5)
            }
        });

        // ============= Web sockets
        const name = "websocket-api";
        const webSocketApi = new CfnApi(this, "websocket-api", {
            disableExecuteApiEndpoint: false,
            disableSchemaValidation: true,
            protocolType: 'WEBSOCKET',
            name: name,
            routeSelectionExpression: '$request.body.action'
        });
        // stage
        const stage = new CfnStage(this, 'Stage', {
            apiId: webSocketApi.attrApiId,
            stageName: 'production',
            defaultRouteSettings: {
                detailedMetricsEnabled: true,
                dataTraceEnabled: true,
                loggingLevel: 'INFO'
            },
            autoDeploy: true,
        });

        // AccessDeniedException:
        // User: arn:aws:sts::677805137000:assumed-role/....
        // is not authorized to perform: execute-api:Invoke on resource:
        // arn:aws:execute-api:us-east-1:********7000:w1sk4tjx8j/production/POST/production/@connections/KO7AjfXIoAMCJWg%3D
        const apiWildcardArn = `arn:aws:execute-api:${Stack.of(this).region}:${Stack.of(this).account}:${webSocketApi.ref}/${stage.ref}/POST/@connections/*}`;
        const callbackPolicyStatement = new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [apiWildcardArn],
            actions: ['execute-api:ManageConnections', 'execute-api:Invoke']
        });
        props.fargateService.taskDefinition.addToTaskRolePolicy(callbackPolicyStatement);

        // NLB requires connections to be allowed from everywhere
        // TODO: it should be restricted to private subnets CIDR
        props.fargateService.connections.allowFromAnyIpv4(
            Port.tcp(port),
            `Allow traffic from everywhere ${port}`
        );

        let integrationUri = `http://${this.nlb.loadBalancerDnsName}${props.apiUrlPrefix}/ws`;
        if (props.environment === 'local'){
            integrationUri = `http://${this.nlb.loadBalancerDnsName}:${port}${props.apiUrlPrefix}/ws`;
        }

        // ============= Web sockets - connection
        const webSocketAuthorizer = new WebSocketAuthorizer(this, "web-socket-authorizer", {
            authorizerName: 'web-socket-authorizer',
            userPoolClientId: props.userPoolClientId,
            userPoolId: props.userPoolId,
            gateway: webSocketApi,
            environment: props.environment
        });

        const connectIntegration = new CfnIntegration(this, "connect-integration", {
            apiId: webSocketApi.attrApiId,
            connectionType: 'VPC_LINK',
            connectionId: vpcNlbLink.attrVpcLinkId,
            integrationType: 'HTTP',
            integrationUri: integrationUri,
            integrationMethod: "GET",
            requestParameters: {
                'integration.request.header.tenantid': 'context.authorizer.tenantid',
                'integration.request.header.X-Websocket-ConnectionId': 'context.connectionId',
            },
            passthroughBehavior: 'WHEN_NO_MATCH'
        });

        new CfnIntegrationResponse(this, "connect-response", {
            apiId: webSocketApi.attrApiId,
            integrationId: connectIntegration.ref,
            integrationResponseKey: "$default",
        });

        const connectRoute = new CfnRoute(this, "connect-route", {
            apiId: webSocketApi.attrApiId,
            routeKey: '$connect',
            authorizationType: 'CUSTOM',
            authorizerId: webSocketAuthorizer.authorizer.attrAuthorizerId,
            operationName: "connect-route",
            target: `integrations/${connectIntegration.ref}`,
            routeResponseSelectionExpression: '$default',
        });

        // Forwards the status code 200 back to the client, to complete the connection
        new CfnRouteResponse(
            this,
            "connect-route-response",
            {
                apiId: webSocketApi.attrApiId,
                routeId: connectRoute.ref,
                routeResponseKey: '$default',
            },
        );

        // ============= Web sockets - disconnection
        const disconnectIntegration = new CfnIntegration(this, "disconnect-integration", {
            apiId: webSocketApi.attrApiId,
            connectionType: 'VPC_LINK',
            connectionId: vpcNlbLink.attrVpcLinkId,
            integrationType: 'HTTP',
            integrationUri: integrationUri,
            integrationMethod: "DELETE",
            requestParameters: {
                'integration.request.header.X-Websocket-ConnectionId': 'context.connectionId',
            }
        });

        new CfnIntegrationResponse(this, "disconnect-response", {
            apiId: webSocketApi.attrApiId,
            integrationId: disconnectIntegration.ref,
            integrationResponseKey: "$default"
        });

        const disconnectRoute = new CfnRoute(this, "disconnect-route", {
            apiId: webSocketApi.attrApiId,
            routeKey: '$disconnect',
            operationName: "disconnect-route",
            target: `integrations/${disconnectIntegration.ref}`,
            routeResponseSelectionExpression: '$default'
        });

        new CfnRouteResponse(
            this,
            "disconnect-route-response",
            {
                apiId: webSocketApi.attrApiId,
                routeId: disconnectRoute.ref,
                routeResponseKey: '$default',
            }
        );

        // ============= Web sockets - messages
        const integration = new CfnIntegration(this, "message-integration", {
            apiId: webSocketApi.attrApiId,
            connectionType: 'VPC_LINK',
            connectionId: vpcNlbLink.attrVpcLinkId,
            integrationType: 'HTTP',
            integrationUri: integrationUri,
            integrationMethod: 'POST',
            requestParameters: {
                'integration.request.header.X-Websocket-ConnectionId': 'context.connectionId',
                'integration.request.header.X-Websocket-Domain': 'context.domainName'
            }
        });

        new CfnIntegrationResponse(this, "message-response", {
            apiId: webSocketApi.attrApiId,
            integrationId: integration.ref,
            integrationResponseKey: "$default"
        });

        const route = new CfnRoute(this, "message-route", {
            apiId: webSocketApi.attrApiId,
            routeKey: "message",
            operationName: "message-route",
            target: `integrations/${integration.ref}`,
            routeResponseSelectionExpression: '$default'
        });

        new CfnRouteResponse(
            this,
            "message-route-response",
            {
                apiId: webSocketApi.attrApiId,
                routeId: route.ref,
                routeResponseKey: '$default',
            }
        );

        new CfnOutput(this, 'WebSocketApiUrl', {
            exportName: `${Stack.of(this)}-ws-api-url`,
            value: `${webSocketApi.attrApiEndpoint}/${stage.stageName}`
        });
    }
}