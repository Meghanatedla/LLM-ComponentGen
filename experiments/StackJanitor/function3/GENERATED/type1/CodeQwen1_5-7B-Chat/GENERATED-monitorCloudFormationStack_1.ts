import { CloudFormationEvent } from 'aws-lambda';
import { Entity } from 'dynamodb-toolbox';
import { MonitoringResultStatus, StackJanitorStatus } from 'stackjanitor-commons';

import { config } from './config';
import { logger } from './logger';
import { CloudFormationEventDetail, DataItem, DeleteItem, JanitorRecord } from './types';
import { getStackArn } from './utils/getStackArn';

const { ACTIONS } = StackJanitorStatus;

const handleDataItem = async (action: keyof typeof Actions, item: DataItem | DeleteItem) => {
  const { tableName } = config;
  const janitorRecord = new JanitorRecord({ tableName });

  try {
    switch (action) {
      case ACTIONS.PUT:
        await janitorRecord.put(item);
        break;
      case ACTIONS.DELETE:
        await janitorRecord.delete(item.id);
        break;
      default:
        throw new Error(`Unsupported action ${action}`);
    }

    return MonitoringResultStatus.SUCCESS;
  } catch (error) {
    logger.error(`Error handling ${action} action for item: ${item}`, error);
    return MonitoringResultStatus.IGNORE;
  }
};

const monitorCloudFormationStack = async (event: CloudFormationEvent, dataMapper: Entity) => {
  const eventDetail = event.detail as CloudFormationEventDetail;

  if (eventDetail.stackStatus !== 'CREATED' && eventDetail.stackStatus !== 'UPDATED') {
    logger.info(`Ignoring ${eventDetail.eventName} event for stack: ${eventDetail.stackId}`);
    return MonitoringResultStatus.IGNORE;
  }

  const stackArn = getStackArn(event);

  const item = eventDetail.eventName === 'CreateStack' ?
    generateItemFromEvent(event, stackArn) :
    generateDeleteItem(event);

  return handleDataItem(eventDetail.eventName === 'CreateStack' ? ACTIONS.PUT : ACTIONS.DELETE, item);
};

export default monitorCloudFormationStack;