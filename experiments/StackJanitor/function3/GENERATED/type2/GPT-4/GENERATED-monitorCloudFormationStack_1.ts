import { CloudFormationEvent, DataItem, DeleteItem } from 'stackjanitor'; // use the correct import paths
import { Entity } from 'dynamodb-toolbox';
import logger from '../logger';
import {config} from '../config';

type MonitoringResultStatus = 'success' | 'ignore';

const DEFAULT_DELETE_INTERVAL = config.DEFAULT_DELETE_INTERVAL || 48; // a default value if not specified in config

// Helper functions
const getExpirationTime = (eventTime: string): Date => {
	let currentDate = new Date(eventTime);
	currentDate.setHours(currentDate.getHours() + DEFAULT_DELETE_INTERVAL);
	return currentDate;
};

const generateItemFromEvent = (event: CloudFormationEvent): DataItem => {
	let { stackId, stackName, eventTime } = event.detail;
	let expirationTime = getExpirationTime(eventTime);
	
	return {
		stackId,
		stackName,
		expirationTime
	};
};

const generateDeleteItem = (event: CloudFormationEvent): DeleteItem => {
	let { stackId, stackName } = event.detail;
	
	return {
		stackId,
		stackName
	};
};

const handleDataItem = async(
	action: 'put' | 'delete', /* put & delete are only considered here based on use case */
	dataMapper: Entity<DataItem | DeleteItem>,
	event: CloudFormationEvent
) => {
	let item;
	
	if (action === 'put') {
		item = generateItemFromEvent(event);
	} else if (action === 'delete') {
		item = generateDeleteItem(event);
	} else {
		return Promise.resolve('ignore'); // Ignore unsupported actions
	}
	
	try {
		await dataMapper[action](item);
		return Promise.resolve('success');
	} catch (error) {
		logger.error(`Failed to ${action} item in DynamoDB`, error);
		return Promise.resolve('ignore');
	}
};

const monitorCloudFormationStack = async(
	event: CloudFormationEvent,
	dataMapper: Entity<DataItem | DeleteItem>
): Promise<MonitoringResultStatus> => {
	switch (event.detail.eventName) {
		case 'CreateStack':
		case 'UpdateStack':
			return handleDataItem('put', dataMapper, event);
		case 'DeleteStack':
			return handleDataItem('delete', dataMapper, event);
		default:
			return Promise.resolve('ignore'); // Ignore unsupported event types
	}
};

export default monitorCloudFormationStack;