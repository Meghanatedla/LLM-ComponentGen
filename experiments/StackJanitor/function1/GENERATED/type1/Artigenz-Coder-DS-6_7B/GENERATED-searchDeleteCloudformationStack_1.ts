import { describeAllStacks } from './utils/describeAllStacks';
import { returnStackStatus } from './utils/helpers';
import { returnStackTags } from './utils/helpers';
import { isStackExpired } from './utils/isStackExpired';
import { getStackName } from './utils/helpers';
import { deleteStack } from '../cloudformation';

export async function searchDeleteCloudformationStack() {
  // Step 1: Retrieve all CloudFormation stacks
  const allStacks = await describeAllStacks();

  // Step 2: Filter stacks based on status, tags and expiration time
  let expiredStacks = [];

  for (const stack of allStacks) {
    if (returnStackStatus(stack) === 'DELETE_COMPLETE') continue; // Skip completed deletions
    
    // Check if stack is marked for deletion
    if (!returnStackTags(stack).includes('stackjanitor=enabled')) continue;
      
    // Check if stack has expired
    if (!isStackExpired(stack)) continue;
        
    // Add stack to expiredStacks array
    expiredStacks.push(stack);
  }

  // Step 3: Extract the names of the expired stacks
  const expiredStackNames = expiredStacks.map((stack) => getStackName(stack));

  // Step 4: Iterate through the list of expired stack names and initiate deletion for each
  for (const stackName of expiredStackNames) {
    try {
      await deleteStack({ StackName: stackName });
    } catch (error) {
      console.log(`Failed to delete stack ${stackName}: ${error}`);
    }
  }
}