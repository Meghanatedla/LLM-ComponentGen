// @ts-check
import pino from 'pino';
import { ValidationError } from './ValidationError'; // assuming this exists
import { UuidIdGenerator } from './UuidIdGenerator'; // assuming this exists
import { DynamoDbOrderRepository } from './DynamoDbOrderRepository'; // assuming this exists
import { KinesisOrderStream } from './KinesisOrderStream'; // assuming this exists

export const logger = pino();

/**
 * Places a new order.
 * @param {{newOrder: Object, headers: Object, orderRepository: DynamoDbOrderRepository, orderStream: KinesisOrderStream, idGenerator: UuidIdGenerator, apiKey: string, restaurants: Array<string>, enabled: Boolean}} params 
 */
export async function app({ newOrder, headers, orderRepository, orderStream, idGenerator, apiKey, restaurants, enabled }) {
    try {
        // Input Validation
        if(!enabled){
            throw new Error('Order placement is currently disabled');
        }
        
        // API Key Validation
        if(headers['Authorization']!== apiKey){
            throw new ValidationError('Invalid API Key');
        }

        // Order Validation
        if(!newOrder ||!newOrder.order ||!restaurants.includes(newOrder.restaurantId)){
            throw new ValidationError('Invalid Order');
        }

        // Generate Unique Order Id
        const orderId = idGenerator.generateId();

        // Construct Complete Order Object
        const order = {
            orderId,
           ...newOrder
        };

        // Persist Order Information
        await orderRepository.save(order);

        // Create Event
        const event = {
            eventType: 'placed',
            orderId,
            restaurantId: newOrder.restaurantId
        };

        // Publish Event
        await orderStream.send(event);

        // Return Order Id
        return { orderId };
    } catch (error) {
        logger.error(error);
        throw error;
    }
}