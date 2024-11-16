/// <reference path="../typings.d.ts" />
// Import necessary dependencies specific to CloudFormation, AWS SDK, and methods coded in the codebase
import { CloudFormation } from "aws-sdk";
import * as cloudformation from "../cloudformation";
import { describeAllStacks } from "./utils/describeAllStacks";
import { returnStackStatus, returnStackTags, getStackName } from "./utils/helpers";
import { isStackExpired } from "./utils/isStackExpired";
import { StackJanitorStatus, DEFAULT_EXPIRATION_PERIOD } from "../constants";

const cloudformationService = new CloudFormation();

// Main function implementation
export const handler = async (): Promise<void> => {
  // Retrieves all CloudFormation stacks
  const allStacks = await describeAllStacks(cloudformationService);
  allStacks.forEach(async (stack) => {
    try {
      // Check StackStatus, halt if stack is in progress or has been deleted
      const stackStatus = returnStackStatus(stack);
      if (stackStatus === StackJanitorStatus.IN_PROGRESS || stackStatus === StackJanitorStatus.DELETED) {
        return;
      }

      // Get tags of stack, halt if StackJanitor tag is not set to enabled
      const stackTags = returnStackTags(stack);
      const isStackJanitorEnabled = stackTags?.find(
        (tag) => tag.Key === "stackjanitor" && tag.Value === "enabled"
      );
      if (!isStackJanitorEnabled) {
        return;
      }

      // Check if stack has expired, halt if stack has not expired
      if (!isStackExpired(stack, DEFAULT_EXPIRATION_PERIOD)) {
        return;
      }

      // Extracts stack name
      const stackName = getStackName(stack);
      
      // Initiates deletion if all checks have passed
      await cloudformation.deleteStack(cloudformationService, stackName);

      console.log(`Initiated deletion of expired stack: ${stackName}`)
      
    } catch (err) {
      console.error(`Failed to check/delete stack: ${stack.StackName}\n`, err);
    }
  });
};