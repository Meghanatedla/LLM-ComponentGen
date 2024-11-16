import { CloudFormationEvent, CustomTag, StackStatus, Actions } from 'stackjanitor';
import { CloudFormationClient, DescribeStacksCommand, DescribeStacksCommandInput } from '@aws-sdk/client-cloudformation';
import { logger } from '../helpers/logger';
import { generateDeleteItem, handleDataItem } from '../handlers/monitorCloudFormationStack';
import { DynamoDataModel } from '../models/DynamoDataModel';

// AWS SDK client for CloudFormation
const cloudFormationClient = new CloudFormationClient({});

/**
 * Determines the StackJanitor status (enabled or disabled) for a CloudFormation stack based on CloudFormation events.
 * @param event - The CloudFormation event object.
 * @returns A Promise that resolves to an object containing the original event and the determined StackJanitor status.
 */
export async function index(event: CloudFormationEvent): Promise<{ event: CloudFormationEvent; results: { stackjanitor: StackStatus } }> {
    let stackjanitorStatus: StackStatus = 'Disabled';

    try {
        switch (event.detail.eventName) {
            case 'CreateStack':
                // Directly extract tags from the event for CreateStack events
                const createTags = event.detail.requestParameters.tags;
                stackjanitorStatus = getStackJanitorStatus(createTags);
                break;

            case 'UpdateStack':
            case 'DeleteStack':
                // Fetch tags using the AWS SDK for UpdateStack and DeleteStack events
                const stackName = event.detail.requestParameters.stackName;
                const describeStacksInput: DescribeStacksCommandInput = { StackName: stackName };
                const describeStacksCommand = new DescribeStacksCommand(describeStacksInput);
                const describeStacksResponse = await cloudFormationClient.send(describeStacksCommand);

                if (describeStacksResponse.Stacks && describeStacksResponse.Stacks.length > 0) {
                    const stackTags = getTagsFromStacks(describeStacksResponse.Stacks);
                    stackjanitorStatus = getStackJanitorStatus(stackTags);

                    // If the event is an UpdateStack and the stackjanitor status is Disabled, delete the DynamoDB record
                    if (event.detail.eventName === 'UpdateStack' && stackjanitorStatus === 'Disabled') {
                        const deleteItem = generateDeleteItem(event);
                        await handleDataItem(deleteItem, DynamoDataModel, Actions.DELETE);
                    }
                } else {
                    logger.warn(`No stacks found for stack name: ${stackName}`);
                }
                break;

            default:
                logger.warn(`Unsupported event type: ${event.detail.eventName}`);
                break;
        }
    } catch (error) {
        logger.error(`Error determining StackJanitor status: ${error.message}`);
        stackjanitorStatus = 'Disabled';
    }

    return {
        event,
        results: {
            stackjanitor: stackjanitorStatus,
        },
    };
}

/**
 * Extracts tags from an array of Stack objects.
 * @param stacks - An array of Stack objects.
 * @returns An array of CustomTag objects.
 */
function getTagsFromStacks(stacks: any[]): CustomTag[] {
    return stacks.flatMap(stack => convertTags(stack.Tags));
}

/**
 * Searches for a specific tag by key within an array of tags.
 * @param tags - An array of CustomTag objects.
 * @param tagKey - The key of the tag to find.
 * @returns The value of the tag if found, otherwise undefined.
 */
function findTag(tags: CustomTag[], tagName: TagName): string | undefined => {
    const tag = tags.find(tag => tag.Key === tagName);
    return tag ? tag.Value : undefined;
}

/**
 * Determines the StackJanitor status based on the presence and value of the stackjanitor tag.
 * @param tags - An array of CustomTag objects.
 * @returns The StackStatus (either "Enabled" or "Disabled").
 */
function getStackJanitorStatus(tags: CustomTag[]): StackStatus => {
const stackjanitorTagValue = findTag(tags, TagName.StackJanitor);
return stackjanitorTagValue === "enabled" ? StackStatus.Enabled : StackStatus.Disabled;
}

/**
 * Converts tags from the AWS SDK format to a custom CustomTag format.
 * @param sdkTags - An array of tags in the AWS SDK format.
 * @returns An array of CustomTag objects.
 */
function convertTags(sdkTags: any[]): CustomTag[] {
    return sdkTags.map(tag => ({ Key: tag.Key, Value: tag.Value }));
}