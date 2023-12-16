import {PreTokenGenerationTriggerHandler} from "aws-lambda";

// workaround for https://github.com/aws/aws-cdk/issues/22010
export const handler: PreTokenGenerationTriggerHandler = async (event) => {

    const customClaims: { [name: string]: string } = {};
    const tenantId = event.request.userAttributes['custom:tenantid'];
    customClaims['tenantid'] = tenantId;

    event.response = {
        claimsOverrideDetails: {
            claimsToAddOrOverride: customClaims
        },
    };
    return event;
};
