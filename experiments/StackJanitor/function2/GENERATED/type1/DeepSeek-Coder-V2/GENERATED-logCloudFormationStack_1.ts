import { CloudFormationClient, DescribeStacksCommand } from "@aws-sdk/client-cloudformation";
import { DynamoDBClient, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { CloudFormationEvent, CustomTag, JanitorRecord, StackStatus, TagName, Actions } from "./types";
import { logger } from "./utils/logger";
import { getTagsFromStacks, findTag, getStackJanitorStatus, convertTags, generateDeleteItem, handleDataItem } from "./utils/helpers";

const cloudformationClient = new CloudFormationClient({});
const dynamoDBClient = new DynamoDBClient({});

export const index = async (event: CloudFormationEvent): Promise<{ event: CloudFormationEvent; results: { stackjanitor: StackStatus } }> => {
    const { eventName, requestParameters, stackId } = event.detail;
    let stackjanitorStatus: StackStatus = StackStatus.Disabled;

    try {
        if (eventName === "CreateStack") {
            // Directly extract tags from the event for CreateStack events
            const tags = requestParameters.tags;
            stackjanitorStatus = getStackJanitorStatus(tags);
        } else {
            // For other events, fetch tags using the CloudFormation API
            const describeStacksCommand = new DescribeStacksCommand({ StackName: stackId });
            const describeStacksResponse = await cloudformationClient.send(describeStacksCommand);
            const stacks = describeStacksResponse.Stacks;

            if (stacks && stacks.length > 0) {
                const tags = getTagsFromStacks(stacks);
                stackjanitorStatus = getStackJanitorStatus(tags);

                if (eventName === "UpdateStack" && stackjanitorStatus === StackStatus.Disabled) {
                    // If the stackjanitor status is disabled for UpdateStack events, delete the DynamoDB record
                    const deleteItem = generateDeleteItem(stackId);
                    await handleDataItem(dynamoDBClient, deleteItem, Actions.Delete);
                }
            }
        }
    } catch (error) {
        logger.error("Error processing CloudFormation event", { error, event });
        stackjanitorStatus = StackStatus.Disabled;
    }

    return {
        event,
        results: {
            stackjanitor: stackjanitorStatus,
        },
    };
};

// Helper functions

const getTagsFromStacks = (stacks: any[]): CustomTag[] => {
    return stacks.flatMap(stack => stack.Tags || []).map(convertTags);
};

const findTag = (tags: CustomTag[], tagKey: string): string | undefined {
    const tag = tags.find(tag => tag.Key === tagKey);
    return tag ? tag.Value : undefined;
};

const getStackJanitorStatus = (tags: CustomTag[]): StackStatus {
    const stackjanitorTagValue = findTag(tags, 'stackjanitor');
    return stackjanitorTagValue === 'enabled' ? 'Enabled' : 'Disabled';
};

const convertTags = (tag: any): CustomTag => {
    return { Key: tag.Key, Value: tag.Value };
};

const generateDeleteItem = (stackId: string): any => {
    return {
        TableName: process.env.DYNAMODB_TABLE_NAME,
        Key: marshall({ stackId }),
    };
};

const handleDataItem = async (client: DynamoDBClient, item: any, action: Actions): Promise<void> => {
    try {
        if (action === Actions.Delete) {
            const deleteCommand = new DeleteItemCommand(item);
            await client.send(deleteCommand);
        }
    } catch (error) {
        logger.error("Error handling DynamoDB item", { error, item, action });
    }
};