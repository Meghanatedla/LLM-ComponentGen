// place-order.js

const laconia = require('@laconia/core');
const api = require('@laconia/adapter-api');
const config = require('@laconia/config');
const xray = require('@laconia/xray');
const warmer = require('@laconia/middleware-lambda-warmer');
const pino = require('pino')();

const ValidationError = require('./ValidationError');
const DynamoDbOrderRepository = require('./DynamoDbOrderRepository');
const KinesisOrderStream = require('./KinesisOrderStream');
const UuidIdGenerator = require('./UuidIdGenerator');

// Laconia dependency injection configuration
const app = async ({ newOrder, headers }, { orderRepository, orderStream, idGenerator, apiKey, restaurants, enabled }) => {
  // Validate API Key
  if (headers.authorization !== apiKey) {
    throw new ValidationError('Invalid API Key');
  }

  // Validate if order placement is enabled
  if (!enabled) {
    throw new Error('Order placement is currently disabled');
  }

  // Validate restaurant ID
  const restaurantId = newOrder.order.restaurantId;
  if (!restaurants.includes(restaurantId)) {
    throw new ValidationError('Invalid Restaurant ID');
  }

  // Generate unique order ID
  const orderId = idGenerator.generate();

  // Construct the complete order object
  const order = {
    orderId,
    ...newOrder.order
  };

  // Persist the order data to DynamoDB
  await orderRepository.save(order);

  // Publish "order placed" event to Kinesis stream
  await orderStream.send({
    eventType: 'order_placed',
    orderId,
    restaurantId
  });

  // Return the newly generated orderId
  return { orderId };
};

// Laconia handler configuration
const handler = laconia(api(app))
  .register(DynamoDbOrderRepository)
  .register(KinesisOrderStream)
  .register(UuidIdGenerator)
  .register(config.envVarInstances({
    apiKey: 'API_KEY',
    restaurants: 'RESTAURANT_IDS',
    enabled: 'ORDER_PLACEMENT_ENABLED'
  }))
  .postProcessor(xray.postProcessor())
  .use(warmer());

// Export the handler
module.exports = { handler };