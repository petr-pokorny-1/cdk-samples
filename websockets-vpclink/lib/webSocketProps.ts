import {IVpc} from "aws-cdk-lib/aws-ec2";
import {FargateService} from "aws-cdk-lib/aws-ecs";

export interface WebSocketProps {
    vpc: IVpc;
    fargateService: FargateService,
    userPoolId: string,
    userPoolClientId: string,
    apiUrlPrefix: string,
    environment: string
}