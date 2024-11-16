// ./src/handlers/searchDeleteCloudformationStack.ts

// Import necessary libraries and utilities
import { describeAllStacks } from '../utils/describeAllStacks';
import { returnStackStatus } from '../utils/helpers';
import { returnStackTags } from '../utils/helpers';
import { isStackExpired } from '../utils/isStackExpired';
import { getStackName } from '../utils/helpers';
import { deleteStack } from '../cloudformation';

// Main function to search and delete expired CloudFormation stacks
export const searchDeleteCloudformationStack = async () => {
    try {
        // Retrieve all CloudFormation stacks
        const allStacks = await describeAllStacks();

        // Filter stacks based on status, tags, and expiration time
        const expiredStacks = allStacks.filter(stack => {
            return returnStackStatus(stack) === 'DELETE_IN_PROGRESS' &&
                returnStackTags(stack).includes('stackjanitor=enabled') &&
                isStackExpired(stack, 7); // Assuming 7 days as the default expiration period
        });

        // Extract names of the expired stacks
        const expiredStackNames = expiredStacks.map(stack => getStackName(stack));

        // Delete each expired stack
        expiredStackNames.forEach(async stackName => {
            await deleteStack(stackName);
        });

    } catch (error) {
        console.error('Error in searchDeleteCloudformationStack:', error);
        throw error;
    }
};