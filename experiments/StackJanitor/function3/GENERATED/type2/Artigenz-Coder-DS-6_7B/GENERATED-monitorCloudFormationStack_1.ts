import { Entity } from 'dynamodb-toolbox';
import { CloudFormationEvent, DeleteItem, DataItem, JanitorRecord } from './types'; // import necessary types
import config from './config'; // import configuration
import logger from './logger'; // import logger
import { getStackArn } from './helperFunctions'; // import helper functions

export async function monitorCloudFormationStack(event: CloudFormationEvent, dataMapper: Entity<JanitorRecord>): Promise<'success' | 'ignore'> {
    try {
        const stackId = await getStackArn(event); // retrieve stack id
        switch (event.detail.eventName) {
            case 'CreateStack':
                let expirationTime = new Date();
                expirationTime.setSeconds(expirationTime.getSeconds() + config.DEFAULT_EXPIRATION_PERIOD); // calculate expiration time
                const createItem: DataItem = {
                    stackId,
                    expirationTime,
                   ...otherDetails // other necessary details
                };
                await handleDataItem('put', createItem, dataMapper); // put item in db
                break;
            case 'UpdateStack':
                let updateExpirationTime = new Date();
                updateExpirationTime.setSeconds(updateExpirationTime.getSeconds() + config.DEFAULT_EXPIRATION_PERIOD); // calculate expiration time
                const updateItem: DataItem = {
                    stackId,
                    expirationTime: updateExpirationTime,
                   ...otherDetails // other necessary details
                };
                await handleDataItem('put', updateItem, dataMapper); // put item in db
                break;
            case 'DeleteStack':
                const deleteItem: DeleteItem = {
                    stackId,
                };
                await handleDataItem('delete', deleteItem, dataMapper); // delete item from db
                break;
            default:
                logger.info("Ignoring unsupported event");
                return 'ignore';
        }
        return'success';
    } catch (error) {
        logger.error({ err: error }, "Error while processing event");
        return 'ignore';
    }
}

async function handleDataItem(action: 'put' | 'delete' | 'get' | 'update', item: DataItem | DeleteItem, dataMapper: Entity<JanitorRecord>) {
    switch (action) {
        case 'put':
            await dataMapper.put(item); // put item in db
            break;
        case 'delete':
            await dataMapper.delete(item); // delete item from db
            break;
        case 'get':
            await dataMapper.get(item); // get item from db
            break;
        case 'update':
            await dataMapper.update(item); // update item in db
            break;
        default:
            throw new Error("Invalid action");
    }
}