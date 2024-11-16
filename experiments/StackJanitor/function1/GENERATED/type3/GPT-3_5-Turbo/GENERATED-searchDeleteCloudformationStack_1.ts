import { describeAllStacks } from "./utils/describeAllStacks";
import { returnStackStatus, returnStackTags, isStackExpired, getStackName } from "./utils/helpers";
import { deleteStack } from "../cloudformation";

export const searchDeleteCloudformationStack = async () => {
    // Retrieve all CloudFormation stacks
    const allStacks = await describeAllStacks();

    // Filter stacks based on status
    const filteredStacks = returnStackStatus(allStacks);

    // Further filter stacks based on specific tags
    const taggedStacks = returnStackTags(filteredStacks);

    // Filter stacks based on expiration time
    const expiredStacks = taggedStacks.filter(stack => isStackExpired(stack));

    // Extract names of expired stacks
    const stackNamesToDelete = getStackName(expiredStacks);

    // Delete each expired stack
    stackNamesToDelete.forEach(async (stackName) => {
        await deleteStack(stackName);
    });

    // No explicit return value, function has side effects of deleting expired stacks
};