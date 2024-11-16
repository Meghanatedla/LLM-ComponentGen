import { CloudFormationClient, DescribeStacksCommand } from "@aws-sdk/client-cloudformation";
import { CloudFormationEvent, CustomTag, JanitorRecord, StackStatus, TagName, Actions } from "stackjanitor";
import { logger } from "../logger";
import { generateDeleteItem, handleDataItem } from "../handlers/monitorCloudFormationStack";

const cloudformationClient = new CloudFormationClient({});

enum RequestType {
  Create = "CreateStack",
  Update = "UpdateStack",
  Delete = "DeleteStack",
}

const getTagsFromStacks = (stacks: any[]): CustomTag[] => {
  return stacks.flatMap(stack => stack.Tags || []);
};

const findTag = (tags: CustomTag[], tagName: TagName): CustomTag | undefined => {
  return tags.find(tag => tag.Key === tagName);
};

const getStackJanitorStatus = (tags: CustomTag[]): StackStatus => {
  const stackjanitorTag = findTag(tags, TagName.StackJanitor);
  return stackjanitorTag && stackjanitorTag.Value === "enabled" ? StackStatus.Enabled : StackStatus.Disabled;
};

const convertTags = (tags: any[]): CustomTag[] => {
  return tags.map(tag => ({ Key: tag.Key, Value: tag.Value }));
};

export const index = async (event: CloudFormationEvent) => {
  let stackjanitorStatus: StackStatus;

  try {
    switch (event.detail.eventName) {
      case RequestType.Create:
        const createTags = convertTags(event.detail.requestParameters.tags || []);
        stackjanitorStatus = getStackJanitorStatus(createTags);
        break;

      case RequestType.Update:
      case RequestType.Delete:
        const stackName = event.detail.requestParameters.stackName;
        const describeStacksResponse = await cloudformationClient.send(
          new DescribeStacksCommand({ StackName: stackName })
        );
        const stackTags = getTagsFromStacks(describeStacksResponse.Stacks || []);
        stackjanitorStatus = getStackJanitorStatus(stackTags);

        if (event.detail.eventName === RequestType.Update && stackjanitorStatus === StackStatus.Disabled) {
          const deleteItem = await generateDeleteItem(event);
          await handleDataItem(deleteItem, JanitorRecord, Actions.Destroy);
        }
        break;

      default:
        stackjanitorStatus = StackStatus.Disabled;
        break;
    }
  } catch (error) {
    logger.error({ error, event }, "Error determining StackJanitor status");
    stackjanitorStatus = StackStatus.Disabled;
  }

  return {
    event,
    results: {
      stackjanitor: stackjanitorStatus,
    },
  };
};