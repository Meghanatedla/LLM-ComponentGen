// src/handlers/searchDeleteCloudformationStack.ts
import * as dynamodbToolbox from 'dynamodb-toolbox';
import * as stackjanitor from 'stackjanitor';
import * as stackjanitorToolbox from 'stackjanitor/dist/utils/helpers';
import { getConfig } from './utils/config';

// Utility Functions
import { describeAllStacks } from './utils/describeAllStacks';
import { returnStackStatus } from './utils/helpers';
import { returnStackTags } from './utils/helpers';
import { isStackExpired } from './utils/isStackExpired';
import { getStackName } from './utils/helpers';
import { deleteStack } from './cloudformation';

// Get configuration
const config = getConfig();

/**
 * Search and Delete CloudFormation Stacks
 */
async function searchDeleteCloudformationStack() {
  try {
    // Retrieve all CloudFormation stacks
    const allStacks = await describeAllStacks();

    // Filter stacks based on status and specific tags
    const filteredStacks = allStacks
      .filter((stack) => returnStackStatus(stack, ['CREATE_COMPLETE', 'UPDATE_COMPLETE']))
      .filter((stack) => returnStackTags(stack, { 'stackjanitor-enabled': 'true' }));

    // Filter stacks based on expiration time
    const expiredStacks = filteredStacks.filter((stack) => isStackExpired(stack));

    // Extract the names of the expired stacks
    const stackNames = getStackName(expiredStacks);

    // Iterate through the names and delete each stack in parallel
    await Promise.all(
      stackNames.map((stackName) => {
        deleteStack(stackName);
      })
    );
  } catch (error) {
    console.error('Error occurred:', error);
  }
}

export { searchDeleteCloudformationStack };