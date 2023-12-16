import {Construct} from "constructs";
import {SecurityGroup} from "aws-cdk-lib/aws-ec2";
import {DockerImageAsset, Platform} from "aws-cdk-lib/aws-ecr-assets";
import path from "path";
import {
    Cluster,
    ContainerImage,
    CpuArchitecture,
    FargateService,
    FargateTaskDefinition, OperatingSystemFamily,
    Protocol
} from "aws-cdk-lib/aws-ecs";
import {DnsRecordType, PrivateDnsNamespace} from "aws-cdk-lib/aws-servicediscovery";
import {AppClusterProps} from "./appClusterProps";
import {RuntimePlatform} from "aws-cdk-lib/aws-ecs/lib/runtime-platform";

export class AppCluster extends Construct {
    public readonly service: FargateService;

    constructor(scope: Construct, id: string, props: AppClusterProps) {
        super(scope, id);

        // ecs cluster
        const cluster = new Cluster(this, "cluster", {
            clusterName: "test-cluster",
            vpc: props.vpc
        });

        const securityGroup = new SecurityGroup(this, "services-sg", {
            vpc: props.vpc,
            allowAllOutbound: true
        });

        // ecs task
        const dockerAsset = new DockerImageAsset(this, 'api-image', {
            directory: path.join(__dirname, '..', 'api'),
            buildArgs: { 'PLATFORM': 'linux/amd64' }
        });

        const taskDefinition = new FargateTaskDefinition(this,'task-definition',
            {
                cpu: 256,
                memoryLimitMiB: 512
            });
        const taskContainer = taskDefinition.addContainer('container', {
            containerName: 'test-api-container',
            image: ContainerImage.fromDockerImageAsset(dockerAsset),
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
    }
}