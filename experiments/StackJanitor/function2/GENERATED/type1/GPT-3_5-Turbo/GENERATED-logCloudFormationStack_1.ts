import { CloudFormationEvent, Stack } from './types';
import { CloudFormationClient, DescribeStacksCommand } from "@aws-sdk/client-cloudformation";

import { StackStatus, TagName, CustomTag, JanitorRecord } from './enums';
import { logger } from './logger';
import { getTagsFromStacks, findTag, getStackJanitorStatus, convertTags, generateDeleteItem, handleDataItem } from './helpers';

const cloudFormationClient = new CloudFormationClient({});

export const index = async (event: CloudFormationEvent): Promise<{ event: CloudFormationEvent, results: { stackjanitor: StackStatus }}> => {
    try {
        logger.log(`Received CloudFormation event: ${event.detail.eventName}`);

        let stackResult: Stack;
        if(event.detail.eventName === 'Create') {
            const tags = event.detail.requestParameters.tags;
            stackResult = getStackJanitorStatus(tags);
        } else {
            const stackName = event.detail.requestParameters.stackName;
            const describeStacksCommand = new DescribeStacksCommand({ StackName: stackName });
            const response = await cloudFormationClient.send(describeStacksCommand);
            const stacks = response.Stacks || [];
            const tags = getTagsFromStacks(stacks);
            const stackTag = findTag(tags, TagName.StackJanitor);
            stackResult = getStackJanitorStatus(stackTag ? [convertTags(stackTag)] : []);
        }

        logger.log(`StackJanitor status determined for ${event.detail.requestParameters.stackName}: ${stackResult}`);

        if(event.detail.eventName === 'Update' && stackResult === StackStatus.Disabled) {
            const deleteItem = generateDeleteItem(event.detail.requestParameters.stackName);
            await handleDataItem(deleteItem);

            logger.log(`Deleted StackJanitor record for ${event.detail.requestParameters.stackName}`);
        }

        return { event, results: { stackjanitor: stackResult } };
    } catch (error) {
        logger.error(`Error processing CloudFormation event: ${event.detail.eventName}`);
        logger.error(error);

        return { event, results: { stackjanitor: StackStatus.Disabled } };
    }
}