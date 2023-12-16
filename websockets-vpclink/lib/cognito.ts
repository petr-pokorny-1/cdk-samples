import {Construct} from "constructs";
import {CognitoProps} from "./cognitoProps";
import {
    AccountRecovery,
    AdvancedSecurityMode, CfnUserPoolGroup,
    NumberAttribute,
    UserPool,
    UserPoolEmail
} from "aws-cdk-lib/aws-cognito";
import * as cdk from "aws-cdk-lib";
import {CfnOutput, RemovalPolicy, Stack} from "aws-cdk-lib";
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";
import {Runtime} from "aws-cdk-lib/aws-lambda";
import path from "path";

export class Cognito extends Construct {
    userPoolId: string;
    clientId: string;

    constructor(scope: Construct, id: string, props: CognitoProps) {
        super(scope, id);

        const preTokenGenerationLambda = new NodejsFunction(this, 'PreTokenGenerationLambda', {
            functionName: 'cognito-pre-token-generation',
            entry: path.join(__dirname, '..', 'preToken', 'index.ts'),
            handler: 'handler',
            runtime: Runtime.NODEJS_18_X
        })

        const userPool = new UserPool(this, 'UserPool', {
            userPoolName: 'user-pool',
            signInAliases: {
                email: true
            },
            selfSignUpEnabled: true,
            standardAttributes: {
                phoneNumber: {
                    required: false,
                    mutable: true
                },
                givenName: {
                    required: true,
                    mutable: true,
                },
                familyName: {
                    required: true,
                    mutable: true,
                },
            },
            customAttributes: {
                tenantid: new NumberAttribute({mutable: false}),
            },
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireDigits: true,
                requireUppercase: true,
                requireSymbols: false
            },
            accountRecovery: AccountRecovery.EMAIL_ONLY,
            removalPolicy: RemovalPolicy.DESTROY,
            email: UserPoolEmail.withSES({
                sesRegion: Stack.of(this).region,
                fromEmail: props.fromEmail,
                fromName: props.from
            }),
            lambdaTriggers: {
                preTokenGeneration: preTokenGenerationLambda
            },
            advancedSecurityMode: AdvancedSecurityMode.OFF
        });

        const userPoolClient = userPool.addClient(`ApiClient`, {
            userPoolClientName: `api-client`,
            authFlows: {
                userPassword: true,
                userSrp: true
            }
        });

        new CfnUserPoolGroup(this, 'AdminRole', {
            groupName: "Admin",
            userPoolId: userPool.userPoolId
        });

        this.userPoolId = userPool.userPoolId;
        this.clientId = userPoolClient.userPoolClientId;

        new CfnOutput(this, "UserPoolId", {
            exportName: `${Stack.of(this)}-user-pool-id`,
            value: userPool.userPoolId
        });

        new CfnOutput(this, "ClientId", {
            exportName: `${Stack.of(this)}-client-id`,
            value: userPoolClient.userPoolClientId
        });
    }
}