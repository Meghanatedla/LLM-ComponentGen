// src/handlers/searchDeleteCloudformationStack.ts

import { describeAllStacks } from '../optional-handlers/utils/describeAllStacks';
import { returnStackStatus, returnStackTags, getStackName } from '../optional-handlers/utils/helpers';
import { isStackExpired } from '../optional-handlers/utils/isStackExpired';
import { deleteStack } from '../cloudformation';

export async function searchDeleteCloudformationStack() {
    try {
        // Retrieve all CloudFormation stacks
        const allStacks = await describeAllStacks();

        // Filter stacks based on status
        const activeStacks = returnStackStatus(allStacks);

        // Filter stacks based on specific tags (StackJanitor enabled)
        const taggedStacks = returnStackTags(activeStacks);

        // Filter stacks based on expiration time
        const expiredStacks = taggedStacks.filter(stack => isStackExpired(stack));

        // Extract names of expired stacks
        const expiredStackNames = getStackName(expiredStacks);

        // Delete each expired stack
        expiredStackNames.forEach(async (stackName) => {
            await deleteStack(stackName);
        });
    } catch (error) {
        console.error(`Error in searchDeleteCloudformationStack: ${error}`);
        // Handle or log the error appropriately
    }
}