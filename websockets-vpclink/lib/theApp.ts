import * as cdk from "aws-cdk-lib";
import {Stack} from "aws-cdk-lib";
import {Cognito} from "./cognito";
import {Vpc} from "aws-cdk-lib/aws-ec2";
import {WebSocket} from "./webSocket";
import {AppCluster} from "./appCluster";
import {BuildConfig} from "../config";

export interface TheAppProps extends cdk.StackProps {
    environment: string,
    config: BuildConfig
}

export class TheApp extends Stack {

    constructor(scope: cdk.App, id: string, props: TheAppProps) {
        super(scope, id, props);

        const vpc = new Vpc(this, "vpc", {
            vpcName: "test-vpc",
            maxAzs: 2
        });

        const cognito = new Cognito(this, "Cognito", {
            from: props.config.from,
            fromEmail: props.config.fromEmail
        });
        const cluster = new AppCluster(this,'Cluster', {vpc});

        const apiUrlPrefix = "/api";

        // websockets
        const webSocketApi = new WebSocket(
            this, "ws-api", {
                vpc: vpc,
                fargateService: cluster.service,
                userPoolId: cognito.userPoolId,
                userPoolClientId: cognito.clientId,
                apiUrlPrefix: apiUrlPrefix,
                environment: props.environment
            });

    }
}
