// Import necessary functions and dependencies
import { describeAllStacks } from '../optional-handlers/utils/describeAllStacks';
import { returnStackStatus, returnStackTags, getStackName } from '../optional-handlers/utils/helpers';
import { isStackExpired } from '../optional-handlers/utils/isStackExpired';
import { deleteStack } from '../cloudformation';

// Define the Search and Delete Expired CloudFormation Stacks function
export const searchDeleteCloudFormationStack = async () => {
    try {
        // Retrieve all CloudFormation stacks
        const allStacks = await describeAllStacks();

        // Filter stacks based on status, tags, and expiration time
        const filteredStacks = allStacks.filter(stack => {
            return returnStackStatus([stack]) && 
                   returnStackTags([stack]) && 
                   isStackExpired(stack);
        });

        // Extract the names of filtered stacks
        const expiredStackNames = getStackName(filteredStacks);

        // Delete each expired stack
        await Promise.all(expiredStackNames.map(stackName => deleteStack(stackName)));
        
        // If needed, log the successful deletion of expired stacks
        console.log(`Successfully deleted the following expired CloudFormation stacks: ${expiredStackNames}`);
    } catch (error) {
        // Handle any errors that occur during the process
        console.error(`Error while searching and deleting expired CloudFormation stacks: ${error}`);
    }
}

// Invoke the function to initiate the search and deletion process
searchDeleteCloudFormationStack();