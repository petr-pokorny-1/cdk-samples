## Web sockets API with private link integration

1. Launch localstack

```bash
docker compose up
```

1. Bootstrap

```bash
npm run cdk-bootstrap-local
```

2. Deploy


curl -X PUT "https://plxn1f2b37.execute-api.us-east-1.amazonaws.com/api/ws"
curl -X GET "https://plxn1f2b37.execute-api.us-east-1.amazonaws.com/api/status"


aws apigatewaymanagementapi post-to-connection \
--connection-id QHjIJeR-IAMCKxQ= \
--data '{"action": "message", "data": "123"}' \
--endpoint-url https://hj5h8ewari.execute-api.us-east-1.amazonaws.com/production



```sh
aws ecs update-service --cluster test-cluster --service test-service --force-new-deployment
```