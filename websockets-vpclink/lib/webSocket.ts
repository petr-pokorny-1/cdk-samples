import {Construct} from "constructs";
import {
    CfnApi,
    CfnIntegration,
    CfnIntegrationResponse,
    CfnRoute,
    CfnRouteResponse,
    CfnStage
} from "aws-cdk-lib/aws-apigatewayv2";
import {CfnOutput, Stack} from "aws-cdk-lib";
import {WebSocketProps} from "./webSocketProps";
import {WebSocketAuthorizer} from "./webSocketAuthorizer";
import {Effect, PolicyStatement} from "aws-cdk-lib/aws-iam";

export class WebSocket extends Construct {

    constructor(scope: Construct, id: string, props: WebSocketProps) {
        super(scope, id);


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


        // ============= connection
        const webSocketAuthorizer = new WebSocketAuthorizer(this, "web-socket-authorizer", {
            authorizerName: 'web-socket-authorizer',
            userPoolClientId: props.userPoolClientId,
            userPoolId: props.userPoolId,
            gateway: webSocketApi,
            environment: props.environment
        });

        const connectIntegration = new CfnIntegration(this, "connect-integration", {
            apiId: webSocketApi.attrApiId,
            integrationType: 'HTTP',
            integrationUri: props.wsApiEndpoint,
            integrationMethod: "PUT",
            requestParameters: {
                'integration.request.header.tenantid': 'context.authorizer.tenantid',
                'integration.request.header.X-Websocket-ConnectionId': 'context.connectionId',
            }
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
        new CfnRouteResponse(this, "connect-route-response",{
            apiId: webSocketApi.attrApiId,
            routeId: connectRoute.ref,
            routeResponseKey: '$default',
        });

        // ============= disconnection
        const disconnectIntegration = new CfnIntegration(this, "disconnect-integration", {
            apiId: webSocketApi.attrApiId,
            integrationType: 'HTTP',
            integrationUri: props.wsApiEndpoint,
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
        new CfnRouteResponse(this, "disconnect-route-response", {
            apiId: webSocketApi.attrApiId,
            routeId: disconnectRoute.ref,
            routeResponseKey: '$default',
        });

        // ============= messages
        const integration = new CfnIntegration(this, "message-integration", {
            apiId: webSocketApi.attrApiId,
            integrationType: 'HTTP',
            integrationUri: props.wsApiEndpoint,
            integrationMethod: 'POST',
            requestParameters: {
                'integration.request.header.X-Websocket-ConnectionId': 'context.connectionId',
                'integration.request.header.X-Websocket-Domain': 'context.domainName',
                'integration.request.header.X-Websocket-Stage': 'context.stage'
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
        new CfnRouteResponse(this,"message-route-response", {
            apiId: webSocketApi.attrApiId,
            routeId: route.ref,
            routeResponseKey: '$default',
        });

        const apiWildcardArn = `arn:aws:execute-api:${Stack.of(this).region}:${Stack.of(this).account}:${webSocketApi.ref}/${stage.ref}/POST/@connections/*}`;
        const callbackPolicyStatement = new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [apiWildcardArn],
            actions: ['execute-api:ManageConnections', 'execute-api:Invoke']
        });
        // AccessDeniedException:
        // User: arn:aws:sts::677805137000:assumed-role/plowops-dev-plowopsservicesclusterdevplowopsntstes-1SY12A8WQIJMN/dcd5e61ae5894cc98b4500598454c419
        // is not authorized to perform: execute-api:Invoke on resource:
        // arn:aws:execute-api:us-east-1:********7000:w1sk4tjx8j/production/POST/production/@connections/KO7AjfXIoAMCJWg%3D
        props.taskDefinition.addToTaskRolePolicy(callbackPolicyStatement);

        new CfnOutput(this, 'WebSocketApiUrl', {
            exportName: `${Stack.of(this)}-ws-api-url`,
            value: `${webSocketApi.attrApiEndpoint}/${stage.stageName}`
        });
    }
}