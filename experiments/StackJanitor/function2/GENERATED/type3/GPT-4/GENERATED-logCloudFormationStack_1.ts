import { Actions, DynamoDBRecord, DynamoDataModel } from "stackjanitor";
import { CustomTag, StackStatus, TagName } from "../data/types";
import { CloudFormationStackStatuses, Stack } from "@aws-sdk/client-cloudformation";
import {
  DescribeStacksCommand,
  CloudFormationClient,
} from "@aws-sdk/client-cloudformation";
import { logger } from "../logger";
import { generateDeleteItem, handleDataItem } from "./monitorCloudFormationStack";

const cloudformationClient = new CloudFormationClient({});

export const getTagsFromStacks = (stacks: Stack[]): CustomTag[] => {
  return stacks.flatMap((stack) => stack.Tags ?? []);
};

export const convertTags = (tags: AWS.CloudFormation.Tags): CustomTag[] => {
  return tags.map((tag) => ({ Key: tag.Key, Value: tag.Value }));
};

export const findTag = (tags: CustomTag[], tagName: string): CustomTag | undefined => {
  return tags.find((tag) => tag.Key === tagName);
};

export const getStackJanitorStatus = (tag: CustomTag | undefined): StackStatus => {
  return tag && tag.Value === "enabled" ? StackStatus.Enabled : StackStatus.Disabled;
};

// Main Lambda handler function
export const index = async (event: DynamoDBRecord) => {
  const results = {};
  const stackName = event.detail.requestParameters.stackName;

  if (event.detail.eventName === CloudFormationEventTypes.Create) {
    const tag = findTag(
      convertTags(event.detail.requestParameters.tags),
      TagName.StackJanitor
    );

    results.stackjanitor = getStackJanitorStatus(tag);
  } else {
    try {
      const command = new DescribeStacksCommand({ StackName: stackName });
      const response = await cloudformationClient.send(command);
      const tag = findTag(getTagsFromStacks(response.Stacks), TagName.stackJanitor);

      results.stackjanitor = getStackJanitorStatus(tag);
      if (
        event.detail.eventName === CloudFormationEventTypes.Update &&
        results.stackjanitor === StackStatus.Disabled
      ) {
        const deleteItem = generateDeleteItem(event);
        handleDataItem(deleteItem, DynamoDataModel, Actions.Destroy);
      }
    } catch (e: any) {
      logger.error(
        {
          event,
          stack: e.stack,
        },
        "Failed to describe stack"
      );
      results.stackjanitor = StackStatus.Disabled;
    }
  }

  return { event, results };
};