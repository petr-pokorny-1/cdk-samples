import { APIGatewayRequestAuthorizerHandler } from "aws-lambda";
import {CognitoJwtVerifier, JwtRsaVerifier} from "aws-jwt-verify";
import {validateCognitoJwtFields} from "aws-jwt-verify/cognito-verifier";

const userPoolId = process.env.USER_POOL_ID!;
const appClientId = process.env.APP_CLIENT_ID!;
const environment = process.env.ENVIRONMENT!;

export const handler: APIGatewayRequestAuthorizerHandler = async (event, context) => {
    try
    {
        // on localstack, the default CognitoJwtVerifier throws:
        // issuer not allowed: http://localhost.localstack.cloud:4566/us-east-1_0e201ecd962644afaae45343a9f1123b. Expected: https://cognito-idp.us-east-1.amazonaws.com/us-east-1_0e201ecd962644afaae45343a9f1123b
        let issuer = `https://cognito-idp.us-east-1.amazonaws.com/${userPoolId}`
        let jwksUrl =  `https://cognito-idp.us-east-1.amazonaws.com/${userPoolId}/.well-known/jwks.json`
        if (environment === 'local'){
            issuer = `http://localhost.localstack.cloud:4566/${userPoolId}`;
            jwksUrl = `https://localhost.localstack.cloud:4566/${userPoolId}/.well-known/jwks.json`
        }

        const verifier = JwtRsaVerifier.create([
            {
                issuer: issuer,
                audience: null, // audience (~clientId) is checked instead, by the Cognito specific checks below
                customJwtCheck: ({ payload }) =>
                    validateCognitoJwtFields(payload, {
                        tokenUse: null,
                        clientId: appClientId
                    }),
                jwksUri: jwksUrl
            }
        ]);

        const encodedToken = event.queryStringParameters?.Authorization;
        if (!encodedToken) {
            console.log("No token provided");
            return denyAllPolicy();
        }
        const payload = await verifier.verify(encodedToken);
        console.log("Token content:");
        console.log(payload);
        return allowPolicy(event.methodArn, payload);
    } catch (error: any) {
        console.log(error.message);
        return denyAllPolicy();
    }
};

const denyAllPolicy = () => {
    return {
        principalId: "*",
        policyDocument: {
            Version: "2012-10-17",
            Statement: [
                {
                    Action: "*",
                    Effect: "Deny",
                    Resource: "*",
                },
            ],
        },
    };
};

const allowPolicy = (methodArn: string, idToken: any) => {
    const policy = {
        principalId: idToken.sub,
        policyDocument: {
            Version: "2012-10-17",
            Statement: [
                {
                    Action: "execute-api:Invoke",
                    Effect: "Allow",
                    Resource: methodArn,
                },
            ],
        },
        context: {
            // set userId in the context
            userId: idToken.sub,
            tenantid: idToken['custom:tenantid'],
        },
    };

    return policy;
};