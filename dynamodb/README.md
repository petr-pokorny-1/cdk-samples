# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template


curl -d "data" -X PUT https://328a2720.execute-api.localhost.localstack.cloud:4566/test
curl https://328a2720.execute-api.localhost.localstack.cloud:4566/test
awslocal dynamodb scan --table-name test-table