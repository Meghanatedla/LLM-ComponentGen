// Filename: src/handlers/searchDeleteCloudformationStack.ts
// Import necessary utility functions and libraries
import { describeAllStacks } from '../optional-handlers/utils/describeAllStacks';
import { returnStackStatus, returnStackTags, getStackName } from '../optional-handlers/utils/helpers';
import { isStackExpired } from '../optional-handlers/utils/isStackExpired';
import { deleteStack } from '../cloudformation';

import logger from '../logger';

// Import AWS SDK for JavaScript v3
import { Stack } from "@aws-sdk/client-cloudformation";

/**
 * This is the main function of the searchDeleteCloudformationStack handler. 
 * It systematically finds and deletes the expired stacks.
 */
export async function searchDeleteCloudformationStack() {
    try {
        // Step 1: Retrieve all CloudFormation stacks.
        const allStacks = await describeAllStacks();

        // Step 2: Filter stacks based on their status.
        //         We are assuming that we only want to delete 'UPDATE_COMPLETE', 'CREATE_COMPLETE', 'ROLLBACK_COMPLETE' stacks
        const validStatuses = ['UPDATE_COMPLETE','CREATE_COMPLETE','ROLLBACK_COMPLETE'];
        const statusFilteredStacks = returnStackStatus(allStacks, validStatuses);

        // Step 3: Filter the resulting stacks based on the presence of specific tags.
        //         We are assuming that the cleanup process is triggered by the presence of a 'StackJanitor' tag.
        const tagFilteredStacks = returnStackTags(statusFilteredStacks, 'StackJanitor');

        // Step 4: Filter the resulting stacks based on expiration time.
        const expiredStacks = tagFilteredStacks.filter(stack => isStackExpired(stack));

        // Step 5: Extract the names of the expired stacks.
        const stackNamesToDelete = expiredStacks.map(stack => getStackName(stack));

        // Step 6: Iterate through the list of expired stack names and initiate deletion.
        stackNamesToDelete.forEach(async (stackName:string) => {
            await deleteStack(stackName);
        });

        logger.info(`The cleanup process deleted ${stackNamesToDelete.length} expired stacks.`);

    } catch (error) {
        logger.error(`An error occurred during the cleanup process: ${error.message}`);
    }
}