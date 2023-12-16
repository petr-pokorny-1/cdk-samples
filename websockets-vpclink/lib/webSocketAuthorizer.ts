import {Construct} from "constructs";
import {PolicyStatement, Role, ServicePrincipal} from "aws-cdk-lib/aws-iam";
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";
import {Runtime} from "aws-cdk-lib/aws-lambda";
import {CfnAuthorizer} from "aws-cdk-lib/aws-apigatewayv2";
import {Stack} from "aws-cdk-lib";
import {WebSocketAuthorizerProps} from "./webSocketAuthorizerProps";
import path from "path";
export class WebSocketAuthorizer extends Construct {
    get authorizer(): CfnAuthorizer {
        return this._authorizer;
    }
    private readonly _authorizer: CfnAuthorizer;

    constructor(scope: Construct, id: string, props: WebSocketAuthorizerProps) {
        super(scope, id);

        const role = new Role(this,'Role', {
            assumedBy: new ServicePrincipal('apigateway.amazonaws.com')
        });
        role.addToPolicy(new PolicyStatement({resources: ['*'], actions: ['*'],}));

        const authorizerLambda = new NodejsFunction(this, 'Lambda', {
            entry: path.join(__dirname, '..', 'authorizer', 'index.ts'),
            handler: 'handler',
            runtime: Runtime.NODEJS_18_X,
            environment: {
                USER_POOL_ID: props.userPoolId,
                APP_CLIENT_ID: props.userPoolClientId,
                ENVIRONMENT: props.environment
            }
        })

        authorizerLambda.addPermission(
            'authorizerPerm', {
                principal: new ServicePrincipal('apigateway.amazonaws.com'),
                action: 'lambda:InvokeFunction'
            });

        this._authorizer = new CfnAuthorizer(this, props.authorizerName, {
            apiId: props.gateway.attrApiId,
            name: props.authorizerName,
            authorizerType: 'REQUEST',
            authorizerCredentialsArn: role.roleArn,
            authorizerUri: `arn:aws:apigateway:${Stack.of(this).region}:lambda:path/2015-03-31/functions/${authorizerLambda.functionArn}/invocations`,
            identitySource: ['route.request.querystring.Authorization']
        });
    }
}