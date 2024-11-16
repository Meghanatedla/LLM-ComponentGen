// Import necessary dependencies and utility functions
import { describeAllStacks } from '../optional-handlers/utils/describeAllStacks';
import { returnStackStatus, returnStackTags, getStackName } from '../optional-handlers/utils/helpers';
import { isStackExpired } from '../optional-handlers/utils/isStackExpired';
import { deleteStack } from '../cloudformation';

// Define the searchDeleteCloudformationStack function
export async function searchDeleteCloudformationStack() {
    try {
        // Retrieve all CloudFormation stacks
        const allStacks = await describeAllStacks(null);

        // Filter stacks based on status
        const filteredStacksByStatus = returnStackStatus(allStacks);
        
        // Filter stacks based on specific tags
        const filteredStacksByTags = returnStackTags(filteredStacksByStatus);
        
        // Filter expired stacks
        const expiredStacks = filteredStacksByTags.filter(isStackExpired);
        
        // Extract stack names to be deleted
        const stackNamesToDelete = getStackName(expiredStacks);
        
        // Initiate deletion for each expired stack
        stackNamesToDelete.forEach(async (stackName) => {
            await deleteStack(stackName);
        });
        
        console.log('Expired CloudFormation stacks deleted successfully.');

    } catch (error) {
        console.error('Error occurred while searching and deleting expired CloudFormation stacks:', error);
    }
}
