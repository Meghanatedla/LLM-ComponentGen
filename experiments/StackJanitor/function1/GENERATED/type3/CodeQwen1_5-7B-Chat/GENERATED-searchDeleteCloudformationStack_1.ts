import {
  describeAllStacks,
  StackName,
} from "../optional-handlers/utils/describeAllStacks";
import { isStackExpired } from "../optional-handlers/utils/isStackExpired";
import { getStackTags } from "../handlers/logCloudFormationStack";
import { deleteStack } from "../cloudformation";
import { getStackStatusFromTag } from "../handlers/gitHook";
import { StackStatus } from "../tag/TagStatus";

const describeAndDelete = async (): Promise<void> => {
  // Describe all CloudFormation stacks
  const stacks = await describeAllStacks();
  if (!stacks) {
    return;
  }
  // Iterate through the stacks
  stacks.forEach(async (stack) => {
    // Determine if StackJanitor is enabled for this stack
    const stackTags = await getStackTags(stack.StackName);
    const stackJanitorStatus = getStackStatusFromTag(stackTags);
    if (stackJanitorStatus !== StackStatus.Enabled) {
      return;
    }
    // Check if stack has expired
    const hasExpired = isStackExpired(stack);
    if (!hasExpired) {
      return;
    }
    // Initiate stack deletion
    await deleteStack(stack.StackName);
  });
};

export const index = describeAndDelete;
