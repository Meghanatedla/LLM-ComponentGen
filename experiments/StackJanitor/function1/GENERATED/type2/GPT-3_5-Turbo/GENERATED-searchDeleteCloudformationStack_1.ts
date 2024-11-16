// /src/handlers/searchDeleteCloudformationStack.ts

import { describeAllStacks } from '../optional-handlers/utils/describeAllStacks';
import { returnStackStatus, returnStackTags, isStackExpired, getStackName } from '../optional-handlers/utils/helpers';
import { deleteStack } from '../cloudformation';

export async function searchDeleteCloudformationStack() {
  try {
    // Step 1: Retrieve all CloudFormation stacks
    const allStacks = await describeAllStacks(null);

    // Step 2: Filter stacks based on status
    const filteredByStatus = returnStackStatus(allStacks);

    // Step 3: Filter stacks based on specific tags
    const filteredByTags = returnStackTags(filteredByStatus);

    // Step 4: Filter stacks based on expiration time
    const expiredStacks = filteredByTags.filter(stack => isStackExpired(stack));

    // Step 5: Extract the names of the expired stacks
    const expiredStackNames = getStackName(expiredStacks);

    // Step 6: Delete each expired stack
    expiredStackNames.forEach(async stackName => {
      await deleteStack(stackName);
    });

    console.log('Expired CloudFormation stacks successfully deleted.');
  } catch (error) {
    console.error('Error while searching and deleting expired CloudFormation stacks:', error);
  }
}

// Entry point for the Lambda function to execute the search and delete functionality
export async function index(event) {
  await searchDeleteCloudformationStack();
}