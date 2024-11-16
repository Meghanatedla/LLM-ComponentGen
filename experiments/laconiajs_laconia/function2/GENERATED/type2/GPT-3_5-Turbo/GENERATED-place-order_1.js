// File: place-order.js

const { handler } = require('@laconia/adapter-api');
const { config } = require('@laconia/config');
const { ValidationError } = require('./ValidationError');

const placeOrderHandler = async (newOrder, headers, { orderRepository, orderStream, idGenerator, apiKey, restaurants, enabled }) => {
    // Validate API key
    if (headers.authorization !== apiKey) {
        throw new ValidationError('Invalid API Key');
    }

    // Validate if order placement is enabled
    if (!enabled) {
        throw new Error('Order placement is disabled');
    }

    // Validate restaurant ID
    if (!restaurants.includes(newOrder.order.restaurantId)) {
        throw new ValidationError('Invalid Restaurant ID');
    }

    // Generate unique order ID
    const orderId = idGenerator.generate();

    // Construct complete order object
    const orderData = {
        orderId,
        ...newOrder.order
    };

    // Persist order data to DynamoDB
    await orderRepository.save(orderData);

    // Publish "order placed" event to Kinesis
    await orderStream.send({
        eventType: 'order_placed',
        orderId,
        restaurantId: newOrder.order.restaurantId
    });

    // Return the generated orderId
    return { orderId };
};

// Export handler function for API Gateway integration
module.exports.handler = handler(placeOrderHandler);
