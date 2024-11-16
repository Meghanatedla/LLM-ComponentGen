Function_code: 
import { Entity } from "dynamodb-toolbox";
import { CloudFormationEvent, StackJanitorStatus } from "src/types";
import { Actions, DataItem, DeleteItem, JanitorRecord } from "../data/DynamoDataModel";
import config from "./config";
import { logger } from "../logger";
import { getStackArn } from "../helpers/utils";

export type MonitoringResultStatus = "success" | "ignore";

// Util functions
const getExpirationTime = (eventTime: string): number => {
  const currentTimeInSeconds = Math.floor(new Date().getTime() / 1000);
  const eventTimeInSeconds = Math.floor(new Date(eventTime).getTime() / 1000);
  const expirationTimeInSeconds = eventTimeInSeconds + (config.DEFAULT_EXPIRATION_PERIOD * 60 * 60);
  const timeLeft = expirationTimeInSeconds - currentTimeInSeconds;
  
  return timeLeft <= config.DELETE_INTERVAL ? currentTimeInSeconds + config.DELETE_INTERVAL : expirationTimeInSeconds;
}

const generateItemFromEvent = (event: CloudFormationEvent): DataItem => {
  const tags = event.detail.requestParameters.tags;
  const stackName = event.detail.requestParameters.stackName;
  const stackId = event.detail.requestParameters.stackId;
  const expirationTime = getExpirationTime(event.time);

  return {
    stackName,
    stackId,
    timeLeft: expirationTime,
    tags,
    deleteCount: 0
  }
}

const generateDeleteItem = (event: CloudFormationEvent): DeleteItem => {
  const stackName = event.detail.requestParameters.stackName;
  const stackId = event.detail.requestParameters.stackId;

  return { stackName, stackId };
}

async function handleDataItem(item: DataItem | DeleteItem, dataMapper: Entity<JanitorRecord>, action: Actions) {
  try {
    if (action === Actions.Create || action === Actions.Update) {
      await dataMapper.put(item as DataItem);
    } else if (action === Actions.Destroy) {
      await dataMapper.delete(item as DeleteItem);
    } else {
      logger.error(`Unsupported action: ${action}`);
      return "ignore";
    }
  } catch (error) {
    logger.error(`DataItem action failed: ${error}`);
    return "ignore";
  }

  return "success";
}

// Handler function
export const monitorCloudFormationStack = async (event: CloudFormationEvent, dataMapper: Entity<JanitorRecord>): Promise<MonitoringResultStatus> => {
  let resultStatus: MonitoringResultStatus = "ignore";
  let stackStatus = StackJanitorStatus.Disabled;
  let action = Actions.None;

  const stackJanitorTag = event.detail.requestParameters.tags.find(tag => tag.key === "stackjanitor");

  if (stackJanitorTag) {
    stackStatus = stackJanitorTag.value as StackJanitorStatus;
  }

  if (stackStatus === StackJanitorStatus.Enabled) {
    const eventName = event.detail.eventName;

    switch (eventName) {
      case "CreateStack":
        action = Actions.Create;
        break;
      case "UpdateStack":
        action = Actions.Update;
        break;
      case "DeleteStack":
        action = Actions.Destroy;
        break;
      default:
        logger.warn(`Unsupported event type: ${eventName}`);
        break;
    }

    const item = action === Actions.Destroy ? generateDeleteItem(event) : generateItemFromEvent(event);
    resultStatus = await handleDataItem(item, dataMapper, action);
  } else {
    logger.info(`StackJanitor is disabled for Stack: ${getStackArn(event.detail.requestParameters.stackId)}`);
  }

  return resultStatus;
}