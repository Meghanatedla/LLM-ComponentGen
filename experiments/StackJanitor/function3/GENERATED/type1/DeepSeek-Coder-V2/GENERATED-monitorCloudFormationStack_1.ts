import { CloudFormationEvent, DataItem, DeleteItem, StackJanitorStatus } from './types';
import { Entity } from 'dynamodb-toolbox';
import { config } from './config';
import { logger } from './logger';
import { Actions, JanitorRecord } from './dynamodb';
import { getStackArn } from './utils';

/**
 * Generates a DataItem from a CloudFormationEvent for create or update events.
 * @param event - The CloudFormationEvent object.
 * @returns A DataItem object.
 */
function generateItemFromEvent(event: CloudFormationEvent): DataItem {
  const stackName = event.detail.requestParameters.stackName;
  const stackId = event.detail.responseElements.stackId;
  const expirationTime = getExpirationTime(event.detail.eventTime);
  const tags = event.detail.requestParameters.tags || [];

  return {
    stackName,
    stackId,
    expirationTime,
    tags,
  };
}

/**
 * Generates a DeleteItem from a CloudFormationEvent for delete events.
 * @param event - The CloudFormationEvent object.
 * @returns A DeleteItem object.
 */
function generateDeleteItem(event: CloudFormationEvent): DeleteItem {
  const stackName = event.detail.requestParameters.stackName;
  const stackId = event.detail.responseElements.stackId;

  return {
    stackName,
    stackId,
  };
}

/**
 * Calculates the expiration time based on the event time and the default expiration period.
 * @param eventTime - The event time from the CloudFormationEvent.
 * @returns The expiration time as a Date object.
 */
function getExpirationTime(eventTime: string): Date {
  const eventDate = new Date(eventTime);
  const expirationDate = new Date(eventDate.getTime() + config.DEFAULT_EXPIRATION_PERIOD * 60000);
  return expirationDate;
}

/**
 * Handles the interaction with the DynamoDB table based on the provided action.
 * @param action - The action to perform (put, delete, get, update).
 * @param item - The item to be processed (DataItem or DeleteItem).
 * @returns A Promise that resolves to a MonitoringResultStatus.
 */
async function handleDataItem(action: Actions, item: DataItem | DeleteItem): Promise<StackJanitorStatus> {
  try {
    switch (action) {
      case Actions.PUT:
        await JanitorRecord.put(item as DataItem);
        break;
      case Actions.DELETE:
        await JanitorRecord.delete(item as DeleteItem);
        break;
      default:
        throw new Error(`Unsupported action: ${action}`);
    }
    return 'success';
  } catch (error) {
    logger.error(`Error handling data item: ${error.message}`, { error });
    return 'ignore';
  }
}

/**
 * The main function to monitor and manage the lifecycle of CloudFormation stacks.
 * @param event - The CloudFormationEvent object.
 * @param dataMapper - The Entity object representing the DynamoDB table.
 * @returns A Promise that resolves to a MonitoringResultStatus.
 */
export async function monitorCloudFormationStack(
  event: CloudFormationEvent,
  dataMapper: Entity<JanitorRecord>
): Promise<StackJanitorStatus> {
  try {
    switch (event.detail.eventName) {
      case 'CreateStack':
      case 'UpdateStack':
        const dataItem = generateItemFromEvent(event);
        return await handleDataItem(Actions.PUT, dataItem);
      case 'DeleteStack':
        const deleteItem = generateDeleteItem(event);
        return await handleDataItem(Actions.DELETE, deleteItem);
      default:
        logger.info(`Ignoring unsupported event type: ${event.detail.eventName}`);
        return 'ignore';
    }
  } catch (error) {
    logger.error(`Error monitoring CloudFormation stack: ${error.message}`, { error });
    return 'ignore';
  }
}