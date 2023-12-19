import {Construct} from "constructs";
import {SecurityGroup} from "aws-cdk-lib/aws-ec2";
import {DockerImageAsset, Platform} from "aws-cdk-lib/aws-ecr-assets";
import path from "path";
import {
    Cluster,
    ContainerImage, CpuArchitecture,
    FargateService,
    FargateTaskDefinition, LogDriver, OperatingSystemFamily,
    Protocol
} from "aws-cdk-lib/aws-ecs";
import {DnsRecordType, PrivateDnsNamespace} from "aws-cdk-lib/aws-servicediscovery";
import {AppClusterProps} from "./appClusterProps";
import {ApplicationLoadBalancer, ListenerAction, ListenerCondition} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import {IApplicationListener} from "aws-cdk-lib/aws-elasticloadbalancingv2/lib/alb/application-listener";
import {Repository} from "aws-cdk-lib/aws-ecr";
import {Duration} from "aws-cdk-lib";

export class AppCluster extends Construct {
    public readonly service: FargateService;
    public readonly listener: IApplicationListener;
    public readonly taskDefinition: FargateTaskDefinition;

    constructor(scope: Construct, id: string, props: AppClusterProps) {
        super(scope, id);

        // ecs cluster
        const cluster = new Cluster(this, "cluster", {
            clusterName: "test-cluster",
            vpc: props.vpc
        });
        const alb = new ApplicationLoadBalancer(this, 'alb', {
            vpc: props.vpc,
            internetFacing: false
        });

        // ecs task
        let platform = Platform.LINUX_AMD64;
        let cpuArchitecture = CpuArchitecture.X86_64;
        if (props.environment === 'local' && process.arch === 'arm64'){
            platform = Platform.LINUX_ARM64;
            cpuArchitecture = CpuArchitecture.ARM64;
        }

        const taskDefinition = new FargateTaskDefinition(this,'task-definition',{
            cpu: 256,
            memoryLimitMiB: 512,
            runtimePlatform: {
                cpuArchitecture: cpuArchitecture,
                operatingSystemFamily: OperatingSystemFamily.LINUX
            }
        });

        let containerImage: ContainerImage;
        if (props.environment === 'local') {
            const dockerAsset = new DockerImageAsset(this, 'api-image', {
                directory: path.join(__dirname, '..', 'api'),
                platform: platform
            });
            containerImage = ContainerImage.fromDockerImageAsset(dockerAsset);
        } else {
            const ecrRepo = Repository.fromRepositoryName(this, 'ecr-repo', 'test/api-test');
            containerImage = ContainerImage.fromEcrRepository(ecrRepo, 'latest');
        }

        const taskContainer = taskDefinition.addContainer('container', {
            containerName: 'test-api-container',
            image: containerImage,
            logging: LogDriver.awsLogs({streamPrefix: 'api-test-logs'})
        });
        taskContainer.addPortMappings({
            containerPort: 80,
            hostPort: 80,
            protocol: Protocol.TCP
        });

        // service
        const namespace = new PrivateDnsNamespace (
            this,
            "services-ns",
            {
                name: "services-ns",
                vpc: props.vpc,
            }
        );

        const securityGroup = new SecurityGroup(this, "services-sg", {
            vpc: props.vpc,
            allowAllOutbound: true
        });
        this.service = new FargateService (
            this,
            'test-service',
            {
                cluster: cluster,
                taskDefinition: taskDefinition,
                serviceName: 'test-service',
                securityGroups: [securityGroup],
                desiredCount: 1,
                cloudMapOptions: {
                    name: 'api-service',
                    cloudMapNamespace: namespace,
                    dnsRecordType: DnsRecordType.A
                }
            }
        );

        const listener = alb.addListener('Listener', { port: 80 });
        // default listener action on `/` path
        listener.addAction('/', {
            action: ListenerAction.fixedResponse(200, {
                contentType: 'application/json',
                messageBody: '{ "msg": "base route" }' //TODO:
            })
        });
        const targetGroup = listener.addTargets('TargetGroup', {
            priority: 10,
            port: 80,
            targets: [this.service],
            conditions: [
                ListenerCondition.pathPatterns(['/api*']),
            ],
            healthCheck: {
                interval: Duration.seconds(60),
                path: '/api/health',
                timeout: Duration.seconds(5)
            }
        });

        this.listener = listener;
        this.taskDefinition = taskDefinition;
    }
}