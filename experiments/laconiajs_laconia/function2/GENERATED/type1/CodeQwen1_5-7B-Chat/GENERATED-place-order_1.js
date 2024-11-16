const {
  AdapterApi,
  Config,
  Xray,
  MiddlewareLambdaWarmer,
  DynamoDbOrderRepository,
  KinesisOrderStream,
  UuidIdGenerator,
} = require('@laconia/core');
const pino = require('pino');
const ValidationError = require('./validation-error');

module.exports.handler = async (event, context) => {
  // Initialize logger
  const logger = pino({ name: 'place-order' });

  // Load configuration
  const config = new Config();
  const apiKey = config.get('API_KEY');
  const restaurants = config.get('RESTAURANTS').split(',');
  const enabled = config.get('ENABLED') === 'true';

  // Validate API key
  if (!event.headers ||!event.headers.authorization || event.headers.authorization!== apiKey) {
    throw new ValidationError('Invalid API Key');
  }

  // Validate restaurant ID
  if (!event.body ||!event.body.restaurantId ||!restaurants.includes(event.body.restaurantId)) {
    throw new ValidationError('Invalid restaurant ID');
  }

  // Validate order data
  try {
    const newOrder = JSON.parse(event.body);
    if (!newOrder ||!newOrder.order) {
      throw new Error('Invalid order data');
    }
  } catch (err) {
    throw new ValidationError('Invalid order data');
  }

  // Disabled functionality check
  if (!enabled) {
    throw new Error('Order placement is disabled');
  }

  // Inject dependencies
  const idGenerator = new UuidIdGenerator();
  const orderRepository = new DynamoDbOrderRepository();
  const orderStream = new KinesisOrderStream();

  // Generate order ID
  const orderId = idGenerator.generate();

  // Construct order object
  const order = {
   ...newOrder.order,
    orderId,
    restaurantId: event.body.restaurantId,
    status: 'placed',
  };

  // Persist order data to DynamoDB
  await orderRepository.save(order);

  // Publish order placed event to Kinesis stream
  await orderStream.publish({ orderId, restaurantId: event.body.restaurantId });

  // Return response
  return {
    statusCode: 200,
    body: JSON.stringify({ orderId }),
  };
};