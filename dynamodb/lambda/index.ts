import { APIGatewayProxyHandlerV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient, DynamoDBClientConfig, ScanCommand, ScanCommandInput } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, PutCommandInput } from "@aws-sdk/lib-dynamodb";

export const handler: APIGatewayProxyHandlerV2 = async function (event): Promise<APIGatewayProxyResultV2<any>> {
    console.log(`event => ${JSON.stringify(event)}`);

    const dynamoDBClient = new DynamoDBClient({});
    const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

    const tableName = process.env.TABLE_NAME;

    console.log(`tableName => ${tableName}`);

    try {
        switch (event.requestContext.http.method) {
            case 'PUT':
                console.log('Writing to table...');
                const commandInput: PutCommandInput = {
                    TableName: tableName,
                    Item: { "dataItem": "test" }
                };
                const command = new PutCommand(commandInput);
                const result = await docClient.send(command);
                console.log('Write complete', result);
                return {
                    statusCode: 200,
                    body: {}
                };
            case 'GET':
                console.log('Scanning table...');
                const scanCommandInput: ScanCommandInput = {
                    TableName: tableName
                }

                console.log('Scan command input:', scanCommandInput);
                const scanCommand = new ScanCommand(scanCommandInput);
                const data = await docClient.send(scanCommand);
                console.log('Scan command output:', data);
                return {
                    statusCode: 200,
                    body: JSON.stringify(data.Items)
                };
        }
    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: JSON.stringify(err) };
    }
};