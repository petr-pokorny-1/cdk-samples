import { AdminAddUserToGroupCommand, AdminCreateUserCommand, AdminCreateUserCommandInput, AdminSetUserPasswordCommand, AdminSetUserPasswordCommandInput, CognitoIdentityProviderClient, InitiateAuthCommand, InitiateAuthCommandInput, UsernameExistsException } from "@aws-sdk/client-cognito-identity-provider";
import { IUser } from "./user.interface";
import { Config } from "./config";

export class Users {
    private readonly _config: Config;

    constructor(config: Config) {
        this._config = config;
    }

    async getToken(login: string, password: string): Promise<string> {

        const commandInput: InitiateAuthCommandInput = {
            AuthFlow: "USER_PASSWORD_AUTH",
            ClientId: this._config.clientId,
            AuthParameters: {
                USERNAME: login,
                PASSWORD: password
            }
        }

        const cognitoClient = this.createClient();
        const command = new InitiateAuthCommand(commandInput);
        const response = await cognitoClient.send(command);

        if (!response.AuthenticationResult) {
            throw new Error("No authentication result");
        }

        return response.AuthenticationResult.IdToken!;        
    }

    async createUser(user: IUser): Promise<void> {
        // create user using AdminCreateUser endpoint
        const createUserParams: AdminCreateUserCommandInput = {
            Username: user.login,
            UserPoolId: this._config.userPoolId,
            TemporaryPassword: user.password,
            MessageAction: "SUPPRESS",
            UserAttributes: [
                {Name: 'email', Value: user.login},
                {Name: 'given_name', Value: user.givenName},
                {Name: 'family_name', Value: user.familyName}
            ]            
        }
        if (user.tenantId) {
            createUserParams.UserAttributes?.push({Name: 'custom:tenantid', Value: user.tenantId});
        }

        const cognitoClient = this.createClient();

        const createUserCommand = new AdminCreateUserCommand(createUserParams);
        try {
            await cognitoClient.send(createUserCommand);
        } catch (error) {
            if (error instanceof UsernameExistsException) {
                // User already exists, so just return
                return;
            }
        }

        await this.forceUserPassword(user.login, user.password);
    }

    // Force the password for the user, because by default when new users are created
    // they are in FORCE_PASSWORD_CHANGE status. The newly created user has no way to change it though
    private async forceUserPassword(login: string, password: string): Promise<void> {
        const cognitoClient = this.createClient();

        const commandInput: AdminSetUserPasswordCommandInput = {
            Username: login,
            Password: password,
            Permanent: true,
            UserPoolId: this._config.userPoolId
        };
        const forcePasswordCommand = new AdminSetUserPasswordCommand(commandInput);
        await cognitoClient.send(forcePasswordCommand);
    }

    async addUserToRole(login: string, roles: string): Promise<void> {
        const cognitoClient = this.createClient();

        const commandInput = {
            GroupName: roles,
            UserPoolId: this._config.userPoolId,
            Username: login
        };
        const command = new AdminAddUserToGroupCommand(commandInput);
        await cognitoClient.send(command);
    }

    private createClient(): CognitoIdentityProviderClient {
        return new CognitoIdentityProviderClient({
            region: "us-east-1",
            credentials: {
                accessKeyId: this._config.accessKeyId,
                secretAccessKey: this._config.secretAccessKey
            },
            endpoint: this._config.issuer
        });
    }
}