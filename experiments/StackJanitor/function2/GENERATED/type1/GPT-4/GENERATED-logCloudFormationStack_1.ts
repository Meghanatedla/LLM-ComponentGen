import { CloudFormationClient, DescribeStacksCommand, Stack } from "@aws-sdk/client-cloudformation";
import { CloudFormationEvent, CustomTag, Actions, StackStatus, TagName, JanitorRecord } from "../types";
import { generateDeleteItem, handleDataItem } from "../utils/data";
import { getTagsFromStacks, findTag, convertTags, getStackJanitorStatus } from "../utils/tags";
import { logger } from "../utils/logger";

// Instantiate AWS SDK CloudFormation client
const cloudFormationClient = new CloudFormationClient({});

/** 
 * AWS Lambda handler to determine StackJanitor management status based on 
 * CloudFormation events.
 */
export const index = async (event: CloudFormationEvent): Promise<{event: CloudFormationEvent, results: {stackjanitor: StackStatus}}> => {
  try {
    const requestParameters = event.detail.requestParameters;
    let tags: CustomTag[] = [];

    // Different handling for Create event and other events
    if (event.detail.eventName === "CreateStack") {
      tags = requestParameters.tags || [];
    } else {
      const stackDescription = await cloudFormationClient.send(new DescribeStacksCommand({ StackName: requestParameters.stackName }));

      if (stackDescription.Stacks) {
        tags = getTagsFromStacks(stackDescription.Stacks as Stack[]);
      }
    }

    const stackjanitorTag = findTag(convertTags(tags), TagName.StackJanitor);
    
    let stackStatus: StackStatus = StackStatus.Disabled;
    if (stackjanitorTag) {
      stackStatus = getStackJanitorStatus(stackjanitorTag.value);
    }

    // Delete stack record from database if stack status is disabled on Update event
    if (event.detail.eventName === "UpdateStack" && stackStatus === StackStatus.Disabled) {
      const deleteItem: JanitorRecord = generateDeleteItem(event);
      await handleDataItem(Actions.DELETE, deleteItem);
    }

    return {
      event,
      results: {
        stackjanitor: stackStatus,
      },
    };
    
  } catch (err) {
    // If anything goes wrong, assume stackjanitor is disabled and log the error
    logger.error(`Error occurred while processing event. Error: ${err}`);
    return {
      event,
      results: {
        stackjanitor: StackStatus.Disabled,
      },
    };
  }
};