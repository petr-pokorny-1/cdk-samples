import * as cdk from "aws-cdk-lib";
export enum Environment {
    Local = 'local',
    AWS = 'aws'
}

export interface BuildConfig {
    environment: Environment,
    fromEmail: string,
    from: string
}

function ensureString(object: { [name: string]: string }, propertyName: string, defaulValue?: string): string {
    if (!object[propertyName] || object[propertyName].trim().length === 0) {
        if (defaulValue) {
            return defaulValue;
        }
        throw new Error(`${propertyName} was not found in the configuration data and the default value is not defined.`);
    }
    return object[propertyName].trim();
}

export function getEnvByValue(value: string): Environment {
    const indexOfS = Object.values(Environment).indexOf(value as unknown as Environment);
    const key = Object.keys(Environment)[indexOfS];
    const env = Environment[key as keyof typeof Environment];
    return env;
}


export function getConfig(cdkApp: cdk.App): BuildConfig {
    const configurationName = cdkApp.node.tryGetContext('config');
    if (!configurationName) {
        throw new Error("Context variable is missing on CDK command, please pass in `-c config=[name]`");
    }

    const raw = cdkApp.node.tryGetContext(configurationName) as { [name: string]: string };

    const environmentName = ensureString(raw, 'Environment');
    const environment = getEnvByValue(environmentName);

    return {
        environment,
        from: ensureString(raw, 'From'),
        fromEmail: ensureString(raw, 'FromEmail')
    }
}

