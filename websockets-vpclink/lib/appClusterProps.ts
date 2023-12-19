import {IVpc} from "aws-cdk-lib/aws-ec2";

export interface AppClusterProps {
    vpc: IVpc;
    environment: string
}