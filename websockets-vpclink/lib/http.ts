import {Construct} from "constructs";
import {HttpProps} from "./httpProps";
import {
    CfnStage,
    HttpApi,
    HttpMethod,
    HttpStage,
    MappingValue,
    ParameterMapping,
    VpcLink
} from "aws-cdk-lib/aws-apigatewayv2";
import {CfnOutput} from "aws-cdk-lib";
import {LogGroup} from "aws-cdk-lib/aws-logs";
import {HttpAlbIntegration} from "aws-cdk-lib/aws-apigatewayv2-integrations";
import {Peer, Port, SecurityGroup, SubnetType} from "aws-cdk-lib/aws-ec2";

export class Http extends Construct {
    public readonly apiUrl: string;

    constructor(scope: Construct, id: string, props: HttpProps) {
        super(scope, id);

        const httpApi = new HttpApi(this, 'Api', {
            createDefaultStage: false,

        });
        const stage = new HttpStage(this, "DefaultStage", {
            httpApi: httpApi,
            stageName: '$default',
            autoDeploy: true
        });

        const securityGroup = new SecurityGroup(this, "api-test-sg", {
            vpc: props.vpc,
            allowAllOutbound: true
        })
        securityGroup.connections.allowFrom(Peer.anyIpv4(), Port.tcp(80))

        const vpcLink = new VpcLink(this, 'VpcLink', {
            vpc: props.vpc,
            subnets: {subnetType: SubnetType.PRIVATE_WITH_EGRESS},
            securityGroups: [securityGroup]
        });

        const cfnStage = stage.node.defaultChild as CfnStage;
        const logGroup = new LogGroup(this, "http-api-test", {
            logGroupName: "/aws/vendedlogs/http-gw-test",
        });
        cfnStage.accessLogSettings = {
            destinationArn: logGroup.logGroupArn,
            format: JSON.stringify({
                "httpMethod": "$context.httpMethod",
                "integrationErrorMessage": "$context.integrationErrorMessage",
                "protocol": "$context.protocol",
                "requestId": "$context.requestId",
                "requestTime": "$context.requestTime",
                "resourcePath": "$context.resourcePath",
                "responseLength": "$context.responseLength",
                "routeKey": "$context.routeKey",
                "sourceIp": "$context.identity.sourceIp",
                "status": "$context.status",
                "errMsg": "$context.error.message",
                "errType": "$context.error.responseType",
                "intError": "$context.integration.error",
                "intIntStatus": "$context.integration.integrationStatus",
                "intLat": "$context.integration.latency",
                "intReqID": "$context.integration.requestId",
                "intStatus": "$context.integration.status"
            })
        };

        const parameterMapping = new ParameterMapping();
        parameterMapping.appendHeader('x-tenant-id', MappingValue.contextVariable("authorizer.claims.tenantid"));

        const vpcLinkIntegration = new HttpAlbIntegration("api-integration", props.listener,{
            vpcLink,
            parameterMapping
        });

        const route = httpApi.addRoutes({
            path: '/{proxy+}',
            methods: [HttpMethod.ANY],
            integration: vpcLinkIntegration,
            //authorizer: routeOptions.authorizer
        });

        this.apiUrl = `http://${httpApi.apiEndpoint}`;
        new CfnOutput(this, 'APIUrl', {value: this.apiUrl});
    }
}