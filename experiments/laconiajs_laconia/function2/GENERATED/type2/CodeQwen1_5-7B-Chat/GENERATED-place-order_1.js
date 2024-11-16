// place-order.js
const { injectable } = require('@laconia/core');
const ValidationError = require('./ValidationError');

module.exports = injectable(
  {
    orderRepository: 'orderRepository',
    orderStream: 'orderStream',
    idGenerator: 'idGenerator',
    apiKey: 'apiKey',
    restaurants:'restaurants',
    enabled: 'enabled'
  },
  ({
    orderRepository,
    orderStream,
    idGenerator,
    apiKey,
    restaurants,
    enabled
  }) => async ({ newOrder, headers }) => {
    if (!enabled) {
      throw new Error('Order placement is currently disabled.');
    }

    const apiKeyHeader = headers['Authorization'];
    if (apiKeyHeader!== apiKey) {
      throw new ValidationError('Invalid API Key.', 'apiKey');
    }

    const restaurantId = newOrder.order.restaurantId;
    if (!restaurants.includes(restaurantId)) {
      throw new ValidationError('Invalid restaurant ID.','restaurantId');
    }

    const orderId = idGenerator.generate();
    const completeOrder = {
      orderId,
     ...newOrder.order
    };

    await orderRepository.save(completeOrder);
    await orderStream.send(completeOrder);

    return { orderId };
  }
);