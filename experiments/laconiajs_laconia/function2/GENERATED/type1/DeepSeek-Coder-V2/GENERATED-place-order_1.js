const laconia = require('@laconia/core');
const api = require('@laconia/adapter-api');
const config = require('@laconia/config');
const xray = require('@laconia/xray');
const warmer = require('@laconia/middleware-lambda-warmer');
const pino = require('pino');
const { ValidationError } = require('./errors');

// Assuming the following classes and modules are already defined in the codebase
const DynamoDbOrderRepository = require('./repositories/DynamoDbOrderRepository');
const KinesisOrderStream = require('./streams/KinesisOrderStream');
const UuidIdGenerator = require('./utils/UuidIdGenerator');

// Logger setup
const logger = pino();

// Configuration setup
const apiKey = config.envVar('API_KEY').required();
const restaurants = config.envVar('RESTAURANTS').split(',');
const enabled = config.envVar('ENABLED').default('true') === 'true';

// Dependency injection setup
const dependencies = ({ event }) => ({
  orderRepository: new DynamoDbOrderRepository(),
  orderStream: new KinesisOrderStream(),
  idGenerator: new UuidIdGenerator(),
  apiKey: apiKey.read(),
  restaurants: restaurants.read(),
  enabled: enabled.read(),
});

// Main function
const placeOrder = async (event, { orderRepository, orderStream, idGenerator, apiKey, restaurants, enabled }) => {
  if (!enabled) {
    throw new Error('Order placement is currently disabled');
  }

  const { newOrder, headers } = event;

  // Validate API Key
  if (headers['authorization'] !== apiKey) {
    throw new ValidationError('Invalid API Key');
  }

  // Validate Restaurant ID
  if (!restaurants.includes(newOrder.restaurantId)) {
    throw new ValidationError('Invalid Restaurant ID');
  }

  // Generate unique order ID
  const orderId = idGenerator.generate();

  // Construct the complete order object
  const order = {
    orderId,
    ...newOrder.order,
  };

  // Persist the order data
  await orderRepository.saveOrder(order);

  // Publish order placed event
  await orderStream.publishOrderPlacedEvent({ orderId, restaurantId: newOrder.restaurantId });

  // Return the order ID
  return { orderId };
};

// Laconia setup
const app = laconia(api(placeOrder)).register(dependencies);

// X-Ray tracing
app.use(xray());

// Lambda warmer support
app.use(warmer());

// Error handling
app.on('error', (error) => {
  logger.error(error);
  throw error;
});

module.exports = app;