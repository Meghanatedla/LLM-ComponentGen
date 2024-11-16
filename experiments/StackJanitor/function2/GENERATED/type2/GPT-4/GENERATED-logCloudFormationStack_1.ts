import { StackStatus, TagName, Actions } from '../enums';
import { CloudFormationEvent, CustomTag } from '../types';
import { CloudFormationClient, DescribeStacksCommand, Stack } from '@aws-sdk/client-cloudformation';
import { generateDeleteItem, handleDataItem } from './monitorCloudFormationStack';
import { logger } from '../logger';
import { DynamoDataModel } from '../models/DynamoDataModel';

export async function index(event: CloudFormationEvent): Promise<{ event: CloudFormationEvent, results: { stackjanitor: StackStatus } }> {
  try {
    const client = new CloudFormationClient({ region: process.env.AWS_REGION });
    let tags: CustomTag[] | undefined;

    if (event.detail.eventName === 'Create') {
      tags = event.detail.requestParameters.tags
        ? convertTags(event.detail.requestParameters.tags)
        : undefined;
    } else {
      const stacksResponse = await client.send(
        new DescribeStacksCommand({ StackName: event.detail.requestParameters.stackName }),
      );
      
      if (stacksResponse.Stacks) {
        tags = getTagsFromStacks(stacksResponse.Stacks);
        tags = convertTags(tags);
      }
    }
    
    let stackjanitor = getStackJanitorStatus(tags);
    
    if (event.detail.eventName === 'Update' && stackjanitor === StackStatus.Disabled) {
      const deleteItem = generateDeleteItem(event);
      handleDataItem(deleteItem, DynamoDataModel, Actions.DELETE);
    }
    
    return { event, results: { stackjanitor } };
  } catch (err) {
    logger.error('Error determining StackJanitor status for stack: ', err.message);
    return { event, results: { stackjanitor: StackStatus.Disabled } };
  }
}

function getTagsFromStacks(stacks: Stack[]): CustomTag[] {
  const stack = stacks[0];
  return stack.Tags || [];
}

function findTag(tagKey: string, tags: CustomTag[]): string | undefined {
  const tag = tags.find(t => t.key === tagKey);
  return tag ? tag.value : undefined;
}

function convertTags(tags: CustomTag[]): CustomTag[] {
  return tags.map(tag => ({ key: tag.Key, value: tag.Value }));
}

function getStackJanitorStatus(tags?: CustomTag[]): StackStatus {
  const value = findTag(TagName.StackJanitor, tags || []);
  return value && value.toLowerCase() === 'enabled' ? StackStatus.Enabled : StackStatus.Disabled;
}