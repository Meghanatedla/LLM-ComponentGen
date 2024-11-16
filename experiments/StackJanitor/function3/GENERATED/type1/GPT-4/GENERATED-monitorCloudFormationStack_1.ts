// Importing necessary dependencies and types
import { CloudFormationEvent, DataItem, DeleteItem, StackJanitorStatus } from '../types';
import { Actions, Entity, JanitorRecord } from 'dynamodb-toolbox';
import { config, logger } from '../util';
import { getStackArn } from '../helpers';

/**
 * Helper function to create a new data item from a CloudFormationEvent. 
 * Used when handling create and update stack actions.
 *
 * @param {CloudFormationEvent} event
 * @param {number} expirationPeriod - The number of seconds a stack is considered active before it should be deleted.
 * @returns {DataItem}
 */
function generateItemFromEvent(event: CloudFormationEvent, expirationPeriod: number): DataItem {
  const item: DataItem = {
    stackName: event.detail.requestParameters.stackName,
    stackId: getStackArn(event),
    eventTime: event.detail.eventTime,
    expirationTime: getExpirationTime(event.detail.eventTime, expirationPeriod),
    tags: event.detail.responseElements.tags || {},
  };
  return item;
}

/**
 * Helper function to create a new delete item from a CloudFormationEvent. 
 * Used when handling delete stack actions.
 *
 * @param {CloudFormationEvent} event
 * @returns {DeleteItem}
 */
function generateDeleteItem(event: CloudFormationEvent): DeleteItem {
  const deleteItem: DeleteItem = {
    stackName: event.detail.requestParameters.stackName,
    stackId: getStackArn(event),
  };
  return deleteItem;
}

/**
 * Helper function to determine an expiration time for a stack.
 *
 * @param {string} eventTime - Date and time the stack was created or last updated.
 * @param {number} expirationPeriod - The number of seconds a stack is considered active before automatically deleted.
 * @returns {string} - The date and time at which a stack item should expire.
 */
function getExpirationTime(eventTime: string, expirationPeriod: number): string {
  return new Date(new Date(eventTime).getTime() + expirationPeriod * 1000).toISOString();
}

/**
 * Handler function for all actions performed on the DynamoDB table (i.e., put, delete, get, update).
 *
 * @param {Entity} dataMapper - DynamoDB entity object that allows interaction with a DynamoDB table.
 * @param {Action} action - Specifies the type of action (put, delete, get, update) to be performed.
 * @param {DataItem | DeleteItem} data - The data to be acted upon in the table.
 */
async function handleDataItem(dataMapper: Entity<JanitorRecord>, action: Actions, data: DataItem | DeleteItem) {
  try {
    switch (action) {
      case Actions.put:
      case Actions.update:
        await dataMapper.put(data as DataItem);
        break;
      case Actions.delete:
        await dataMapper.delete(data as DeleteItem);
        break;
      default:
        return 'ignore';
    }
    return 'success';
  } catch (error) {
    logger.error(`Failed to process data: ${error}`);
    return 'ignore';
  }
}

/**
 * The function `monitorCloudFormationStack` acts as main logic 
 * for maintaining CloudFormation stacks lifecycle ensuring its record in the DynamoDB table.
 *
 * @param {CloudFormationEvent} event - Represents the CloudFormation stack operation: create, update, or delete.
 * @param {Entity<JanitorRecord>} dataMapper - Represents a DynamoDB table and helpful object for DynamoDB interaction.
 */
export async function monitorCloudFormationStack(event: CloudFormationEvent, dataMapper: Entity<JanitorRecord>): Promise<StackJanitorStatus> {
  const expirationPeriod = config.DEFAULT_EXPIRATION_PERIOD || 7 * 24 * 60 * 60; // default to 7 days expressed in seconds

  switch (event.detail.eventName) {
    case 'CreateStack':
    case 'UpdateStack':
      const dataItem = generateItemFromEvent(event, expirationPeriod);
      return await handleDataItem(dataMapper, Actions.put, dataItem);
    case 'DeleteStack':
      const deleteItem = generateDeleteItem(event);
      return await handleDataItem(dataMapper, Actions.delete, deleteItem);
    default:
      logger.info(`Unsupported CloudFormation event type: ${event.detail.eventName}`);
      return 'ignore';
  }
}