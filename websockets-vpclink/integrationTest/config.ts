import { CloudFormationClient, CloudFormationClientConfig, DescribeStacksCommand } from "@aws-sdk/client-cloudformation";

const ENVIRONMENT=process.env.ENVIRONMENT || "local";
const AWS_ACCESS_KEY_ID=process.env.AWS_ACCESS_KEY_ID || "test";
const AWS_SECRET_ACCESS_KEY=process.env.AWS_SECRET_ACCESS_KEY || "test";
const AWS_DEFAULT_REGION="us-east-1"

const stackName = `app-stack-${ENVIRONMENT}`;

export interface Config {
    environment: string;
    userPoolId: string | undefined;
    secretAccessKey: string;
    accessKeyId: string;
    issuer: string;
    clientId: string;
    wsApiUrl: string;
}

async function getCloudFormationOutput(stackName: string, exportName: string): Promise<string> {
    
    const config: CloudFormationClientConfig = {
        region: AWS_DEFAULT_REGION,
        credentials: {
            accessKeyId: AWS_ACCESS_KEY_ID,
            secretAccessKey: AWS_SECRET_ACCESS_KEY
        }
    } 

    if (ENVIRONMENT === 'local') {
        config.endpoint = "http://127.0.0.1:4566"
    }

    const client = new CloudFormationClient(config);

    const command = new DescribeStacksCommand({ StackName: stackName });
    const response = await client.send(command);

    if (!response) {
        throw new Error("Cannot describe stack.");
    }
    
    const stack = response.Stacks?.[0];

    const outputs = stack?.Outputs;

    if (!outputs) {
        throw new Error("No outputs found");
    }

    //console.log(outputs);

    const output = outputs.find(o => o.ExportName === exportName);

    if (!output || !output.OutputValue) {
        throw new Error(`No output found with export name ${exportName}`);
    }

    return output.OutputValue;
}


export const getConfig = async function(): Promise<Config> {
    const userPoolId = await getCloudFormationOutput(stackName, `${stackName}-user-pool-id`);
    let issuer = `https://cognito-idp.us-east-1.amazonaws.com/${userPoolId}`;
    if (ENVIRONMENT == 'local') {
        issuer = `https://localhost.localstack.cloud:4566/${userPoolId}`;
    }
    const clientId = await getCloudFormationOutput(stackName, `${stackName}-client-id`);
    const wsApiUrl = await getCloudFormationOutput(stackName, `${stackName}-ws-api-url`);

    const retVal: Config = {
        issuer: issuer,
        clientId: clientId,
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
        userPoolId: userPoolId,
        wsApiUrl: wsApiUrl,
        environment: ENVIRONMENT
    };

    return retVal;
}