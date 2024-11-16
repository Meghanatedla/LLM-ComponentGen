import { describeAllStacks } from './utils/describeAllStacks';
import { returnStackStatus, returnStackTags, getStackName } from './utils/helpers';
import { isStackExpired } from './utils/isStackExpired';
import { deleteStack } from '../cloudformation';
import { AWSError } from 'aws-sdk';
import { StatusCodes } from '../constants/StatusCodes';
import { logger } from '../logger';

// Function for Searching and Deleting Expired Stacks
export const searchDeleteExpiredStacks = async () => {
  let stackInfo;

  try {
    // Retrieve all CloudFormation stacks 
    stackInfo = await describeAllStacks();
  } catch (e: AWSError) {
    logger.error(e.message);
    return;
  }
 
  // Filter the stacks based on Status. The example uses 'CREATE_COMPLETE' for demonstration.
  // It can be replaced with the status your system uses to indicate a stack is available for deletion
  const availableStacks = returnStackStatus(stackInfo, StatusCodes.CREATE_COMPLETE);

  // Filter above stacks list based on tag key-value pair indicating StackJanitor feature enabled
  const stackJanitorEnabledStacks = returnStackTags(availableStacks, 'stackjanitor', 'enabled');

  // Filter stacks for expiration status
  const expiredStacks = stackJanitorEnabledStacks.filter(isStackExpired);

  // Extract the names of expired stacks for deletion
  const expiredStackNames = expiredStacks.map(getStackName);

  // Loop through expired stack for deletion
  expiredStackNames.forEach(async (stackName) => {
    try {
      await deleteStack(stackName);
    } catch (e: AWSError) {
      logger.error(e.message);
    }
  });
}