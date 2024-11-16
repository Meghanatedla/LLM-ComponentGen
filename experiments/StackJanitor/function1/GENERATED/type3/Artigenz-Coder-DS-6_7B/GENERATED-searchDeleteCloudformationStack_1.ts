import { CloudFormation } from 'aws-sdk';
import { describeAllStacks, isStackExpired, returnStackStatus, returnStackTags, getStackName } from './utils';
import { deleteStack } from '../cloudformation';

const searchDeleteCloudformationStack = async () => {
  // Initialize AWS CloudFormation client
  const cf = new CloudFormation();

  // Get all CloudFormation stacks
  const allStacks = await describeAllStacks(cf);

  // Filter stacks based on status and tags
  const filteredStacks = allStacks
   .filter(returnStackStatus(['CREATE_COMPLETE', 'UPDATE_COMPLETE']))
   .filter(returnStackTags([{ Key: 'StackJanitor', Value: 'Enabled' }]));

  // Filter stacks based on expiration time
  const expiredStacks = filteredStacks.filter(isStackExpired());

  // Get names of expired stacks
  const expiredStackNames = expiredStacks.map(getStackName);

  // Delete each expired stack
  expiredStackNames.forEach(deleteStack);
};

export { searchDeleteCloudformationStack };