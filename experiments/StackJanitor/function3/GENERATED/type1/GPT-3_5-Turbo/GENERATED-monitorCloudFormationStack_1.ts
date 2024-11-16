// Import necessary libraries and types
import { CloudFormationEvent, DataItem, DeleteItem, JanitorRecord, StackJanitorStatus } from './types';
import { Entity } from 'dynamodb-toolbox';
import { Actions, getStackArn, logger } from './utils/config';

// Function to monitor CloudFormation stack events and manage stack lifecycle
export const monitorCloudFormationStack = async (event: CloudFormationEvent, dataMapper: Entity) => {
    try {
        // Determine the event type
        switch (event.detail.eventName) {
            case 'CreateStack': {
                const newItem = generateItemFromEvent(event);
                await handleDataItem(dataMapper, newItem, Actions.PUT);
                break;
            }
            case 'UpdateStack': {
                const updatedItem = generateItemFromEvent(event);
                await handleDataItem(dataMapper, updatedItem, Actions.PUT);
                break;
            }
            case 'DeleteStack': {
                const deleteItem = generateDeleteItem(event);
                await handleDataItem(dataMapper, deleteItem, Actions.DELETE);
                break;
            }
            default: {
                // Unsupported event type, ignore
                return StackJanitorStatus.IGNORE;
            }
        }

        return StackJanitorStatus.SUCCESS;
    } catch (error) {
        logger.error(`Error processing CloudFormation event: ${error.message}`);
        return StackJanitorStatus.IGNORE;
    }
}

// Helper function to generate DataItem from CloudFormation event
const generateItemFromEvent = (event: CloudFormationEvent): DataItem => {
    const stackArn = getStackArn(event);
    const expirationTime = getExpirationTime(event);
    
    return {
        PK: stackArn,
        SK: 'metadata',
        expirationTime,
        // Add more properties as needed based on event data
    };
}

// Helper function to generate DeleteItem from CloudFormation event
const generateDeleteItem = (event: CloudFormationEvent): DeleteItem => {
    const stackArn = getStackArn(event);
    
    return {
        PK: stackArn,
        SK: 'metadata',
        // Add more properties as needed based on event data
    };
}

// Helper function to calculate expiration time based on event time and default expiration period
const getExpirationTime = (event: CloudFormationEvent): number => {
    const eventTime = new Date(event.time);
    const expirationPeriod = config.DEFAULT_EXPIRATION_PERIOD; // Assuming DEFAULT_EXPIRATION_PERIOD is defined
    
    return eventTime.getTime() + (expirationPeriod * 24 * 60 * 60 * 1000); // Expiration time in milliseconds
}

// Function to handle database interactions based on action type
const handleDataItem = async (dataMapper: Entity, item: DataItem | DeleteItem, action: Actions) => {
    switch (action) {
        case Actions.PUT:
            await dataMapper.put(item);
            break;
        case Actions.DELETE:
            await dataMapper.delete(item);
            break;
        default:
            // Unsupported action, log error
            logger.error(`Unsupported Action: ${action}`);
            break;
    }
}