// src/handlers/searchDeleteCloudformationStack.ts

import { describeAllStacks } from "../optional-handlers/utils/describeAllStacks";
import { returnStackStatus } from "../optional-handlers/utils/helpers";
import { returnStackTags } from "../optional-handlers/utils/helpers";
import { isStackExpired } from "../optional-handlers/utils/isStackExpired";
import { getStackName } from "../optional-handlers/utils/helpers";
import { deleteStack } from "../cloudformation";
import { logger } from "../logger";

export const searchDeleteCloudformationStack = async () => {
  try {
    // Step 1: Retrieve all CloudFormation stacks
    const allStacks = await describeAllStacks();

    // Step 2: Filter stacks based on status
    const filteredByStatus = returnStackStatus(allStacks);

    // Step 3: Filter stacks based on specific tags
    const filteredByTags = returnStackTags(filteredByStatus);

    // Step 4: Filter stacks based on expiration time
    const expiredStacks = filteredByTags.filter(isStackExpired);

    // Step 5: Extract the names of the expired stacks
    const expiredStackNames = getStackName(expiredStacks);

    // Step 6: Iterate through the list of expired stack names and initiate deletion for each
    expiredStackNames.forEach(async (stackName) => {
      try {
        await deleteStack(stackName);
        logger.info(`Deleted stack: ${stackName}`);
      } catch (e: any) {
        logger.error(
          {
            stack: e.stack,
            stackName,
          },
          `Failed to delete stack: ${stackName} - ${e.message}`,
        );
      }
    });
  } catch (e: any) {
    logger.error(
      {
        stack: e.stack,
      },
      `Failed to search and delete expired CloudFormation stacks: ${e.message}`,
    );
  }
};

export const index = async () => {
  await searchDeleteCloudformationStack();
};