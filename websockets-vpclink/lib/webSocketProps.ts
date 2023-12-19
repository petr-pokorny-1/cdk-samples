import {IVpc} from "aws-cdk-lib/aws-ec2";
import {FargateService, FargateTaskDefinition} from "aws-cdk-lib/aws-ecs";

export interface WebSocketProps {
    userPoolId: string,
    userPoolClientId: string,
    environment: string,
    wsApiEndpoint: string,
    taskDefinition: FargateTaskDefinition
}