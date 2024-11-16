// place-order.js

const { ValidationError } = require('@laconia/core');

const placeOrder = async (newOrder, headers, { orderRepository, orderStream, idGenerator, apiKey, restaurants, enabled }) => {
    // Validate API key
    if (headers.authorization !== apiKey) {
        throw new ValidationError('Unauthorized. API Key is invalid.');
    }

    // Validate if order placement is enabled
    if (!enabled) {
        throw new Error('Order placement is currently disabled.');
    }

    // Validate restaurant ID
    if (!restaurants.includes(newOrder.order.restaurantId)) {
        throw new ValidationError('Invalid restaurant ID.');
    }

    // Generate unique order ID
    const orderId = idGenerator.generate();

    // Construct complete order object
    const order = {
        id: orderId,
        ...newOrder.order
    };

    // Save order data to DynamoDB
    await orderRepository.save(order);

    // Publish "order placed" event to Kinesis
    await orderStream.publish({
        orderId,
        restaurantId: newOrder.order.restaurantId
    });

    return { orderId };
};

module.exports = placeOrder;