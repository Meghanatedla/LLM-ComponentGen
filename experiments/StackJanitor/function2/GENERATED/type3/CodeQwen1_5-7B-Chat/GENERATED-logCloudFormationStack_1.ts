// defines custom stackjanitor types and enums
import { StackJanitorStatus, getTagsFromStacks, findTag, convertTags, getStackJanitorStatus } from './utils/helpers';
import { CloudFormationEvent, CustomTag, JanitorRecord } from 'stackjanitor';
import { StackStatus, TagName, Actions } from 'stackjanitor';
import { logger } from './logger';
import { DescribeStacksCommand, DescribeStacksCommandInput, DescribeStacksCommandOutput, CloudFormationClient, CloudFormationClientConfig } from '@aws-sdk/client-cloudformation';
import { Entity, JanitorStackData } from './data/DynamoDataModel';

export const index = async (event: CloudFormationEvent): Promise<{ event: CloudFormationEvent; results: StackJanitorStatus }> => {
  let stackJanitorStatus: StackJanitorStatus;
  // Extract tags from event
  if (event.detail.eventName === 'Create') {
    const tags = event.detail.requestParameters.tags as CustomTag[];
    stackJanitorStatus = {
      stackjanitor: getStackJanitorStatus(tags),
    };
  } else {
    const response = await new CloudFormationClient({ region: 'us-east-1' }).send(new DescribeStacksCommand(<DescribeStacksCommandInput>{
      StackName: event.detail.requestParameters.stackName,
    }));
    const tags = getTagsFromStacks(response.Stacks);
    stackJanitorStatus = {
      stackjanitor: getStackJanitorStatus(tags),
    };
  }

  // If the stackjanitor status is Disabled and event is an Update, delete the record from the dynamodb table
  if (event.detail.eventName === 'Update' && stackJanitorStatus.stackjanitor === 'Disabled') {
    const deleteItem = await generateDeleteItem(event);
    await handleDataItem(deleteItem, JanitorRecord, Actions.Destroy);
  }

  return {
    event,
    results: stackJanitorStatus,
  };
};

// Helper function to generate a DeleteItem object based on the given CloudFormationEvent
const generateDeleteItem = async (event: CloudFormationEvent): Promise<JanitorStackData> => {
  let stackName: string;
  let stackId: string | undefined;

  if (event.detail.eventName === 'Delete') {
    logger.info(`matched eventName ${'Delete'}`);
    // matches "arn:aws:cloudformation:ap-southeast-2:01234567890:stack/dna-ml-poc-teddy/fe4b14b0-b0fa-11ee-901a-02e779f78083"
    if (event.detail.requestParameters.stackName.startsWith('arn')) {
      stackName = event.detail.requestParameters.stackName.split('/')[1];
      stackId = event.detail.requestParameters.stackName;
      // tricky else block where the DeleteStack is called but no ARN is in the stackId
    } else {
      stackName = event.detail.requestParameters.stackName;
      stackId = await getStackArn(stackName);
    }
    // when not delete event, should have the stackId in the event body
  } else {
    stackName = event.detail.requestParameters.stackName;
    stackId = event.detail.responseElements?.stackId;
  }

  return {
    stackName,
    stackId,
  };
};

// Helper function to interact with the DynamoDB table to perform actions
const handleDataItem = async (item: JanitorStackData, handler: Entity, action: Actions) => {
  try {
    switch (action) {
      case Actions.Create:
        await handler.put(item);
        break;
      case Actions.Destroy:
        if (!item.stackId) {
          logger.info(item, 'No stackId to destroy, exiting early');
          break;
        }
        await handler.delete(item);
        break;
      case Actions.Get:
        await handler.get(item);
        break;
      case Actions.Update:
        await handler.update(item);
        break;
      default:
        throw new Error(`Unmatched action: ${action}`);
    }
    return;
  } catch (e: any) {
    logger.error(
      {
        stackInfo: item,
        stack: e.stack,
      },
      e.message,
    );
  }
};

// Helper function to retrieve the ARN of a stack given its name
const getStackArn = async (stackName: string): Promise<string | undefined> => {
  const client = new CloudFormationClient({ region: 'us-east-1' });
  const response = await client.send(new DescribeStacksCommand({ StackName: stackName }));
  if (response.Stacks && response.Stacks.length > 0) {
    return response.Stacks[0].StackId;
  }
  return undefined;
};