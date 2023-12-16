import {CfnApi} from "aws-cdk-lib/aws-apigatewayv2";

export interface WebSocketAuthorizerProps {
    authorizerName: string;
    userPoolId: string,
    userPoolClientId: string,
    gateway: CfnApi,
    environment: string
}