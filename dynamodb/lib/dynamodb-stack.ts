import * as cdk from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2-alpha';
import { CfnOutput } from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import path = require('path');
import { Runtime } from 'aws-cdk-lib/aws-lambda';

export class DynamodbStack extends cdk.Stack {
  httpApi: HttpApi;
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const tableName = 'test-table';

    const table = new Table(this, 'ConnectionsTable', {
        tableName: tableName,
        partitionKey: {
          name: 'dataItem',
          type: AttributeType.STRING,              
        },
        billingMode: BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.httpApi = new HttpApi(this, 'HttpApi');

    const lambda = this.createLambdaFunction(tableName);
    const integration = new HttpLambdaIntegration('LambdaIntegration', lambda);

    this.httpApi.addRoutes({
      path: '/test',
      methods: [ HttpMethod.GET, HttpMethod.PUT ],
      integration: integration,
    });

    new CfnOutput(this, 'HttpApiUrl', { value: this.httpApi.url! });
  }

  private createLambdaFunction(tableName: string) {
    return new NodejsFunction(this, `Lambda`, {
        entry: path.join(__dirname, '..', 'lambda', 'index.ts'),
        projectRoot: path.join(__dirname, '..', '..'),
        runtime: Runtime.NODEJS_18_X,
        memorySize: 256,
        environment: {
            TABLE_NAME: tableName,
            WEBSOCKET_API: this.httpApi.apiId
        },
        description: `${cdk.Stack.of(this)} api lambda`,
        bundling: {
            externalModules: [
                'aws-sdk'
            ],
        }
    });
}
}
