import { CloudFormationEvent, CustomTag, StackStatus, Actions, DataItem } from 'stackjanitor';
import { DescribeStacksCommand, CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { getTagsFromStacks, findTag, convertTags, generateDeleteItem, handleDataItem } from '../helpers/cloudformationHelper';
import logger from '../helpers/logger';

export const index = async (event: CloudFormationEvent): Promise<{ event: CloudFormationEvent, results: { stackjanitor: StackStatus } }> => {
    try {
        let stackStatus: StackStatus = StackStatus.Disabled;

        if (event.detail.eventName === 'CreateStack') {
            const tags = event.detail.requestParameters.tags;
            stackStatus = getStackJanitorStatus(tags);
        } else {
            const stackName = event.detail.requestParameters.stackName;
            const cloudFormationClient = new CloudFormationClient({ region: process.env.AWS_REGION });
            const describeStacksCommand = new DescribeStacksCommand({ StackName: stackName });
            
            const { Stacks } = await cloudFormationClient.send(describeStacksCommand);
            const tags = getTagsFromStacks(Stacks);
            const stackTags = convertTags(tags);
            stackStatus = getStackJanitorStatus(stackTags);

            if (event.detail.eventName === 'UpdateStack' && stackStatus === StackStatus.Disabled) {
                const deleteItem = generateDeleteItem(event);
                await handleDataItem(deleteItem, 'DynamoDataModel', Actions.Delete);
            }
        }

        return { event, results: { stackjanitor: stackStatus } };
    } catch (error) {
        logger.error('Error occurred during StackJanitor status determination:', error);
        return { event, results: { stackjanitor: StackStatus.Disabled } };
    }
};

const getStackJanitorStatus = (tags: CustomTag[]): StackStatus => {
    const stackJanitorTag = findTag(tags, 'stackjanitor');
    return stackJanitorTag && stackJanitorTag.value === 'enabled' ? StackStatus.Enabled : StackStatus.Disabled;
};
