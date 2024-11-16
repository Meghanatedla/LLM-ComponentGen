// File: /handlers/monitorCloudFormationStack.ts

import { DataItem, DeleteItem, Actions, JanitorRecord } from "../data/DynamoDataModel";
import { CloudFormationEvent, StackJanitorStatus } from "stackjanitor";
import { Entity } from "dynamodb-toolbox";
import { config } from "../config";
import { logger } from "../logger";
import { generateItemFromEvent, generateDeleteItem, getExpirationTime } from "./helpers/stackHelpers";

export const monitorCloudFormationStack = async (event: CloudFormationEvent, dataMapper: Entity): Promise<"success" | "ignore"> => {
    try {
        switch (event.detail.eventName) {
            case "CreateStack":
            case "UpdateStack":
                const { stackName, stackId, eventTime, tags } = event.detail;
                const expirationTime = getExpirationTime(eventTime, config.DEFAULT_EXPIRATION_PERIOD);

                const item: DataItem = generateItemFromEvent(stackName, stackId, expirationTime, tags);
                await dataMapper.put(item);

                logger.info(`Successfully processed ${event.detail.eventName} event for stack: ${stackName}`);
                return "success";

            case "DeleteStack":
                const stackNameToDelete = event.detail.stackName;
                const deleteItem: DeleteItem = generateDeleteItem(stackNameToDelete);
                await dataMapper.delete(deleteItem);

                logger.info(`Successfully processed DeleteStack event for stack: ${stackNameToDelete}`);
                return "success";

            default:
                logger.warn(`Unsupported event type: ${event.detail.eventName}`);
                return "ignore";
        }
    } catch (error) {
        logger.error(`Error processing CloudFormation event: ${error.message}`);
        return "ignore";
    }
};