import { CloudFormationEvent } from "stackjanitor";
import { DataItem, DeleteItem } from "../data/DynamoDataModel";
import { createLogger } from "../logger";
import { getExpirationTime } from "../utils/getExpirationTime";
import { getStackArn } from "../utils/getStackArn";

const logger = createLogger();

export const generateItemFromEvent = (
  event: CloudFormationEvent,
  options: { stackArn?: string } = {},
): DataItem | DeleteItem => {
  try {
    const stackName = event.detail.requestParameters.stackName;
    const stackId = event.detail.responseElements.stackId;
    const tags = event.detail.requestParameters.tags;
    const expirationTime = getExpirationTime(event.time, options.stackArn);

    const item: DataItem = {
      id: stackId,
      name: stackName,
      tags,
      expiration: expirationTime,
    };
    logger.info({
      message: "Item created successfully",
      item,
    });
    return item;
  } catch (error) {
    logger.error({ error }, "Error generating item from event");
    throw error;
  }
};

export const generateDeleteItem = async (
  event: CloudFormationEvent,
): Promise<DeleteItem> => {
  try {
    const stackId = event.detail.requestParameters.stackId;
    const item: DeleteItem = {
      id: stackId,
    };
    logger.info({
      message: "Delete item created successfully",
      item,
    });
    return item;
  } catch (error) {
    logger.error({ error }, "Error generating delete item from event");
    throw error;
  }
};

export const getExpirationTime = (
  eventTime: string,
  stackArn?: string,
): string => {
  // calculate expiration time based on event time and default expiration period from config
  return new Date().toISOString();
};