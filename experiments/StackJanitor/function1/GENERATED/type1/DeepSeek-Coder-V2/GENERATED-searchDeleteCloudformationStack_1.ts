// ./src/optional-handlers/searchDeleteCloudformationStacks.ts

import { describeAllStacks } from '../utils/describeAllStacks';
import { returnStackStatus, returnStackTags, getStackName } from '../utils/helpers';
import { isStackExpired } from '../utils/isStackExpired';
import { deleteStack } from '../cloudformation';

export const searchDeleteCloudformationStacks = async () => {
    try {
        // Retrieve all CloudFormation stacks
        const allStacks = await describeAllStacks();

        // Filter stacks based on status
        const filteredByStatus = allStacks.filter(stack => returnStackStatus(stack));

        // Filter stacks based on tags (StackJanitor enabled)
        const filteredByTags = filteredByStatus.filter(stack => returnStackTags(stack, ['stackjanitor:enabled']));

        // Filter stacks based on expiration time
        const expiredStacks = filteredByTags.filter(stack => isStackExpired(stack));

        // Extract the names of the expired stacks
        const expiredStackNames = expiredStacks.map(stack => getStackName(stack));

        // Iterate through the list of expired stack names and initiate deletion for each
        expiredStackNames.forEach(async stackName => {
            try {
                await deleteStack(stackName);
                console.log(`Deleted stack: ${stackName}`);
            } catch (error) {
                console.error(`Failed to delete stack ${stackName}:`, error);
            }
        });
    } catch (error) {
        console.error('Error in searchDeleteCloudformationStacks:', error);
    }
};

// Assuming the following utility functions are defined in the specified paths:
// - describeAllStacks: Retrieves all CloudFormation stacks.
// - returnStackStatus: Filters stacks based on their status.
// - returnStackTags: Filters stacks based on specific tags.
// - isStackExpired: Filters stacks based on expiration time.
// - getStackName: Extracts the names of the stacks to be deleted.
// - deleteStack: Initiates the deletion of a CloudFormation stack.

// This function is designed to be invoked by a scheduled event in the serverless.yml configuration.
// Ensure that the serverless.yml is updated to include this function and its schedule.