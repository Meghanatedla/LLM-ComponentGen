import CloudFormationClient from '../cloudformation';
import {
  describeAllStacks,
  returnStackStatus,
  returnStackTags,
  isStackExpired,
  getStackName,
  deleteStack,
} from './utils/describeAllStacks';
import { getTTL } from './utils/helpers';

export const handler = async () => {
  // Retrieve all CloudFormation stacks
  const stacks = await describeAllStacks();

  // Filter stacks based on status, presence of specific tags, and expiration time
  const filteredStacks = stacks.filter((stack) => {
    const stackJanitorEnabled = returnStackTags(stack, 'stackjanitor') === 'enabled';
    const isStackStopped = returnStackStatus(stack) === 'STOPPED';
    const isStackExpiredValue = isStackExpired(getTTL(stack));
    return stackJanitorEnabled && isStackStopped && isStackExpiredValue;
  });

  // Extract the names of the filtered stacks
  const stackNamesToDelete = filteredStacks.map((stack) => getStackName(stack));

  // Iterate through the extracted names and delete each corresponding stack
  for (const stackName of stackNamesToDelete) {
    await deleteStack(stackName);
  }
};