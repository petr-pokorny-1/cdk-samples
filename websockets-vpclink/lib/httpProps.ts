import {IVpc} from "aws-cdk-lib/aws-ec2";
import {IApplicationListener} from "aws-cdk-lib/aws-elasticloadbalancingv2/lib/alb/application-listener";

export interface HttpProps {
    vpc: IVpc,
    listener: IApplicationListener
}