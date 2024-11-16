import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { Actions, JanitorRecord } from './DynamoDataModel';
import { logger } from './logger';
import { handleDataItem } from './helpers';
import { TagName, StackStatus, CustomTag } from './types';

const client = new CloudFormationClient({ region: 'your-region'});

enum StackJanitorStatus {
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
}

interface CloudFormationEvent {
  detail: {
    eventName: string;
    requestParameters?: {
      stackName: string;
      tags?: CustomTag[];
    };
    errorCode?: string;
  };
}

function getTagsFromStacks(stackName: string): Promise<CustomTag[]> {
  // Assume this function exists and returns the tags of a stack
}

function findTag(tagKey: string, tags: CustomTag[]): CustomTag | null {
  // Assume this function exists and finds a tag by its key in the tags array
}

function getStackJanitorStatus(tags: CustomTag[]): StackStatus {
  // Assume this function exists and gets the stackjanitor status from the tags array
}

function convertTags(tags: CustomTag[]): CustomTag[] {
  // Assume this function exists and converts the tags from AWS SDK format to our custom format
}

export async function index(event: CloudFormationEvent): Promise<any> {
  try {
    const stackName = event.detail.requestParameters?.stackName || '';
    
    let tags: CustomTag[] = [];

    if (event.detail.eventName === 'Create') {
      tags = convertTags(event.detail.requestParameters?.tags || []);
    } else {
      const command = new DescribeStacksCommand({ StackName: stackName });
      const result = await client.send(command);
      
      if (result && result.Stacks && result.Stacks.length > 0) {
        tags = convertTags(getTagsFromStacks(result));
      }
    }

    const stackJanitorStatus = getStackJanitorStatus(tags);

    if (stackJanitorStatus === StackJanitorStatus.DISABLED && event.detail.eventName === 'Update') {
      // Delete record from DynamoDB
      const deleteItem = generateDeleteItem(event);
      await handleDataItem(deleteItem, JanitorRecord, Actions.Destroy);
    }

    return {
      event,
      results: {
        stackjanitor: stackJanitorStatus,
      },
    };
  } catch (err) {
    logger.error('An error occurred: ', err);
    return {
      event,
      results: {
        stackjanitor: StackJanitorStatus.DISABLED,
      },
    };
  }
}