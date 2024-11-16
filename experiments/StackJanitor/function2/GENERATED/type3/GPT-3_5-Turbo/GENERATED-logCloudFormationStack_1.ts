import { CloudFormationEvent, StackStatus, CustomTag, Actions, JanitorRecord } from "stackjanitor";
import { logger } from "../logger";
import { getStackTags } from "./utils/getStackTags";
import { getTagsFromStacks, findTag } from "./utils/helpers";
import { generateDeleteItem, handleDataItem } from "./utils/dynamoUtils";
import { DescribeStacksCommand, CloudFormationClient } from "@aws-sdk/client-cloudformation";

const client = new CloudFormationClient({});

const getStackJanitorStatus = (tags: CustomTag[]): StackStatus => {
    const stackJanitorTag = findTag(tags, "stackjanitor");
    return stackJanitorTag && stackJanitorTag.value === "enabled" ? StackStatus.Enabled : StackStatus.Disabled;
};

export const index = async (event: CloudFormationEvent): Promise<{ event: CloudFormationEvent, results: { stackjanitor: StackStatus }}> => {
    try {
        let stackStatus: StackStatus = StackStatus.Disabled;

        if (event.detail.eventName === "CreateStack") {
            const tags = getTagsFromStacks(event.detail.requestParameters.tags);
            stackStatus = getStackJanitorStatus(tags);
        } else {
            const stackName = event.detail.requestParameters.stackName;

            const params = { StackName: stackName };
            const response = await client.send(new DescribeStacksCommand(params));
            const stacks = response.Stacks || [];
            if (stacks.length > 0) {
                const stackTags = getStackTags(stacks[0]);
                stackStatus = getStackJanitorStatus(stackTags);
            }
        }

        if (event.detail.eventName === "UpdateStack" && stackStatus === StackStatus.Disabled) {
            const deleteItem = generateDeleteItem(event);
            await handleDataItem(deleteItem, JanitorRecord, Actions.Destroy);
        }

        return { event, results: { stackjanitor: stackStatus } };
    } catch (error) {
        logger.error("Error occurred while processing CloudFormation event:", error);
        // Return a default status of Disabled in case of errors
        return { event, results: { stackjanitor: StackStatus.Disabled } };
    }
};