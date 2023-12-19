docker build -t api-test:latest .

aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 677805137000.dkr.ecr.us-east-1.amazonaws.com
docker tag api-test:latest 677805137000.dkr.ecr.us-east-1.amazonaws.com/test/api-test:latest
docker push 677805137000.dkr.ecr.us-east-1.amazonaws.com/test/api-test:latest