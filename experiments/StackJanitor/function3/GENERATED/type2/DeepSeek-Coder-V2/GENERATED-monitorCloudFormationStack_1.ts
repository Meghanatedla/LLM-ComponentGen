// src/handlers/monitorCloudFormationStack.ts

import { CloudFormationEvent, DataItem, DeleteItem, StackJanitorStatus } from 'stackjanitor';
import { Entity } from 'dynamodb-toolbox';
import { config } from '../config';
import { logger } from '../logger';
import { generateItemFromEvent, generateDeleteItem, getExpirationTime, handleDataItem } from '../helpers';
import { getStackArn } from '../helpers/cloudformation';

export async function monitorCloudFormationStack(
    event: CloudFormationEvent,
    dataMapper: Entity<any>
): Promise<MonitoringResultStatus> {
    try {
        const eventName = event.detail.eventName;

        switch (eventName) {
            case 'CreateStack':
            case 'UpdateStack':
                const item = generateItemFromEvent(event, getExpirationTime(event.detail.eventTime));
                await handleDataItem(dataMapper, 'put', item);
                return 'success';

            case 'DeleteStack':
                const deleteItem = generateDeleteItem(event);
                await handleDataItem(dataMapper, 'delete', deleteItem);
                return 'success';

            default:
                logger.warn(`Unsupported event type: ${eventName}`);
                return 'ignore';
        }
    } catch (error) {
        logger.error(`Error processing CloudFormation event: ${error.message}`);
        return 'ignore';
    }
}

// Helper functions

function generateItemFromEvent(event: CloudFormationEvent, expirationTime: string): DataItem {
    return {
        stackName: event.detail.requestParameters.stackName,
        stackId: getStackArn(event),
        expirationTime,
        tags: event.detail.requestParameters.tags || [],
    };
}

function generateDeleteItem(event: CloudFormationEvent): DeleteItem {
    return {
        stackName: event.detail.requestParameters.stackName,
        stackId: getStackArn(event),
    };
}

function getExpirationTime(eventTime: string): string {
    const expirationPeriod = config.DEFAULT_EXPIRATION_PERIOD;
    const eventDate = new Date(eventTime);
    eventDate.setDate(eventDate.getDate() + expirationPeriod);
    return eventDate.toISOString();
}

async function handleDataItem(
    dataMapper: Entity<any>,
    action: 'put' | 'delete',
    item: DataItem | DeleteItem
): Promise<void> {
    try {
        if (action === 'put') {
            await dataMapper.put(item as DataItem);
        } else if (action === 'delete') {
            await dataMapper.delete(item as DeleteItem);
        }
    } catch (error) {
        logger.error(`Error handling data item: ${error.message}`);
        throw error;
    }
}

// Type definitions

type MonitoringResultStatus = 'success' | 'ignore';