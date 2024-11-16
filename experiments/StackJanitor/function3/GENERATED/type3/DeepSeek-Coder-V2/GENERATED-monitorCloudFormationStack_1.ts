import { CloudFormationEvent, DataItem, DeleteItem, StackJanitorStatus } from "stackjanitor";
import { logger } from "../logger";
import { config } from "../config";
import { Entity } from "dynamodb-toolbox";
import { Actions, JanitorRecord } from "../data/DynamoDataModel";
import { getStackArn } from "../helpers";

// Assuming the following types and functions are defined elsewhere in the codebase
// import { getExpirationTime, generateItemFromEvent, generateDeleteItem, handleDataItem } from "../helpers";

// Assuming the following configuration values are defined in config.ts
const DEFAULT_EXPIRATION_PERIOD = config.DEFAULT_EXPIRATION_PERIOD;
const DELETE_INTERVAL = config.DELETE_INTERVAL;

// Assuming the following helper functions are defined in helpers.ts
export const getExpirationTime = (eventTime: string, defaultExpirationPeriod: number): string => {
  const expirationDate = new Date(eventTime);
  expirationDate.setDate(expirationDate.getDate() + defaultExpirationPeriod);
  return expirationDate.toISOString();
};

export const generateItemFromEvent = (event: CloudFormationEvent): DataItem => {
  const eventTime = event.detail.eventTime;
  const expirationTime = getExpirationTime(eventTime, DEFAULT_EXPIRATION_PERIOD);
  return {
    stackName: event.detail.requestParameters.stackName,
    stackId: event.detail.requestParameters.stackId,
    expirationTime,
    tags: event.detail.requestParameters.tags,
  };
};

export const generateDeleteItem = (event: CloudFormationEvent): DeleteItem => {
  return {
    stackName: event.detail.requestParameters.stackName,
    stackId: event.detail.requestParameters.stackId,
  };
};

export const handleDataItem = async (item: DataItem | DeleteItem, entity: Entity<any>, action: Actions): Promise<void> => {
  try {
    switch (action) {
      case Actions.Create:
      case Actions.Update:
        await entity.put(item);
        break;
      case Actions.Destroy:
        await entity.delete(item);
        break;
      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  } catch (error) {
    logger.error({ error, item, action }, "Failed to handle data item");
    throw error;
  }
};

export const monitorCloudFormationStack = async (event: CloudFormationEvent, dataMapper: Entity<JanitorRecord>): Promise<StackJanitorStatus> => {
  try {
    const eventName = event.detail.eventName;

    switch (eventName) {
      case "CreateStack":
      case "UpdateStack":
        const dataItem = generateItemFromEvent(event);
        await handleDataItem(dataItem, dataMapper, Actions.Create);
        return "success";

      case "DeleteStack":
        const deleteItem = generateDeleteItem(event);
        await handleDataItem(deleteItem, dataMapper, Actions.Destroy);
        return "success";

      default:
        logger.info({ event }, "Unsupported event type");
        return "ignore";
    }
  } catch (error) {
    logger.error({ error, event }, "Error processing CloudFormation event");
    return "ignore";
  }
};