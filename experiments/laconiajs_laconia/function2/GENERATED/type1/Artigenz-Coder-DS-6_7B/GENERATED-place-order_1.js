const {
  createHandler,
  httpError,
} = require('@laconia/core');
const {
  apiGatewayAdapter,
  config,
  xray,
  middlewareLambdaWarmer,
} = require('@laconia/adapter-api');
const {
  DynamoDbOrderRepository,
  KinesisOrderStream,
  UuidIdGenerator,
  ValidationError,
} = require('./path/to/your/external/modules'); // replace with actual path

// Define the function
async function placeOrder(event, context) {
  const {
    newOrder,
    headers,
    orderRepository,
    orderStream,
    idGenerator,
    apiKey,
    restaurants,
    enabled,
  } = event;
  
  // Validate inputs
  if (!headers['Authorization'] || headers['Authorization']!== apiKey) {
    throw new ValidationError("Invalid API key");
  }
  if (!enabled) {
    throw new Error("Order placement is currently disabled.");
  }
  if (!restaurants.includes(newOrder.restaurantId)) {
    throw new ValidationError("Invalid restaurant ID");
  }

  // Generate OrderId
  const orderId = idGenerator();

  // Construct order object
  const order = {
   ...newOrder,
    orderId,
  };

  // Save order to database
  await orderRepository.save(order);

  // Publish order placed event
  await orderStream.publish({
    type: 'ORDER_PLACED',
    payload: {
      orderId,
      restaurantId: newOrder.restaurantId,
    },
  });

  // Return response
  return {
    orderId,
  };
}

module.exports = createHandler([
  apiGatewayAdapter(),
  config(),
  xray(),
  middlewareLambdaWarmer(),
], placeOrder);