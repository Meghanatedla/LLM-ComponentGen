// src/handlers/searchDeleteCloudformationStack.ts

import { describeAllStacks } from '../optional-handlers/utils/describeAllStacks';
import { returnStackStatus, returnStackTags, getStackName } from '../optional-handlers/utils/helpers';
import { isStackExpired } from '../optional-handlers/utils/isStackExpired';
import { deleteStack } from '../cloudformation';
import { logger } from '../utils/logger';

/**
 * Searches for and deletes expired CloudFormation stacks based on specific criteria.
 * This function retrieves all CloudFormation stacks, filters them based on status,
 * presence of specific tags, and expiration time, and then deletes the expired stacks.
 */
export async function searchDeleteCloudformationStack(): Promise<void> {
    try {
        // Step 1: Retrieve all CloudFormation stacks
        const allStacks = await describeAllStacks();

        // Step 2: Filter stacks based on status
        const filteredByStatus = returnStackStatus(allStacks);

        // Step 3: Filter stacks based on specific tags
        const filteredByTags = returnStackTags(filteredByStatus);

        // Step 4: Filter stacks based on expiration time
        const expiredStacks = filteredByTags.filter(isStackExpired);

        // Step 5: Extract the names of the expired stacks
        const expiredStackNames = getStackName(expiredStacks);

        // Step 6: Iterate through the list of expired stack names and initiate deletion
        for (const stackName of expiredStackNames) {
            await deleteStack(stackName);
            logger.info(`Deleted expired stack: ${stackName}`);
        }

        logger.info(`Completed deletion of expired stacks.`);
    } catch (error) {
        logger.error(`Error in searchDeleteCloudformationStack: ${error.message}`);
        throw error;
    }
}

// Entry point for the Lambda function
export async function index(): Promise<void> {
    await searchDeleteCloudformationStack();
}