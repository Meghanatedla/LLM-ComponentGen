// Import necessary libraries and types
import { Entity, GetParams, PutParams } from 'dynamodb-toolbox';
import { CloudFormationEvent, DataItem, DeleteItem, StackJanitorStatus } from './types';
import config from './config';
import { logger } from './logger';

// Define Actions enum for DynamoDB operations
enum Actions {
    Create = 'CREATE',
    Destroy = 'DESTROY',
    Read = 'READ',
    Update = 'UPDATE',
}

// Define JanitorRecord Entity for mapping to DynamoDB table
const JanitorRecord = new Entity({
    name: 'JanitorRecord',
    attributes: {
        id: { partitionKey: true },
        stackName: { type: 'String' },
        expirationDate: { type: 'Number' },
        tags: { type: 'List', subAttributes: [{ name: 'key', type: 'String' }, { name: 'value', type: 'String' }] },
    },
});

// Generate expiration time based on event time and default expiration period
function getExpirationTime(eventTime: number): number {
    return eventTime + config.DEFAULT_EXPIRATION_PERIOD;
}

// Generate DataItem from CloudFormationEvent
function generateItemFromEvent(event: CloudFormationEvent): DataItem | undefined {
    // Implement logic to generate DataItem from event
    //...
}

// Generate DeleteItem from CloudFormationEvent
function generateDeleteItem(event: CloudFormationEvent): DeleteItem | undefined {
    // Implement logic to generate DeleteItem from event
    //...
}

// Handle DynamoDB operations based on action
async function handleDataItem(item: DataItem | DeleteItem, entity: Entity, action: Actions) {
    switch (action) {
        case Actions.Create:
        case Actions.Update:
            try {
                const params: PutParams<DataItem> = {
                    Item: item as DataItem,
                };
                await entity.put(params);
            } catch (err) {
                logger.error('Failed to create or update record: ', err);
                throw err;
            }
            break;
        case Actions.Read:
            try {
                const params: GetParams<DataItem> = {
                    Key: { id: item.id },
                };
                const result = await entity.get(params);
                return result?.Item;
            } catch (err) {
                logger.error('Failed to read record: ', err);
                throw err;
            }
            break;
        case Actions.Destroy:
            try {
                const params: GetParams<DataItem> = {
                    Key: { id: item.id },
                };
                const result = await entity.get(params);
                if (!result?.Item) {
                    return false;
                }
                await entity.delete(params);
                return true;
            } catch (err) {
                logger.error('Failed to delete record: ', err);
                throw err;
            }
            break;
        default:
            throw new Error(`Invalid action: ${action}`);
    }
}

// Main function for monitoring CloudFormation events
async function monitorCloudFormationStack(event: CloudFormationEvent): Promise<StackJanitorStatus> {
    const dataMapper = new Entity({
        name: 'DataMapper',
        attributes: {},
    });
    
    switch (event.detail.eventName) {
        case 'CreateStack':
        case 'UpdateStack':
            const item = generateItemFromEvent(event);
            if (!item) {
                throw new Error('Failed to generate item');
            }
            await handleDataItem(item, dataMapper, Actions.Create);
            break;
        case 'DeleteStack':
            const deleteItem = generateDeleteItem(event);
            if (!deleteItem) {
                throw new Error('Failed to generate delete item');
            }
            await handleDataItem(deleteItem, dataMapper, Actions.Destroy);
            break;
        default:
            return StackJanitorStatus.Ignore;
    }
    return StackJanitorStatus.Success;
}

export default monitorCloudFormationStack;