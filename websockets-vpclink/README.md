## Web sockets API with private link integration

1. Launch localstack

```bash
docker compose up
```

1. Bootstrap

```bash
npm run cdk-deploy-local
```

1. Deploy

```bash
npm run cdk-bootstrap-local
```

1. Run test

```bash
cd integrationTest

export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test"
export ENVIRONMENT="local"

ts-node index.ts

```

1. Useful commands:

http tests

```bash
curl -X PUT "https://plxn1f2b37.execute-api.us-east-1.amazonaws.com/api/ws"
curl -X GET "https://plxn1f2b37.execute-api.us-east-1.amazonaws.com/api/status"
```

web sockets message dispatch

```bash
aws apigatewaymanagementapi post-to-connection \
--connection-id QHjIJeR-IAMCKxQ= \
--data '{"action": "message", "data": "123"}' \
--endpoint-url https://xxx.execute-api.us-east-1.amazonaws.com/production
```

force reboot ECS task

```bash
aws ecs update-service --cluster test-cluster --service test-service --force-new-deployment
```