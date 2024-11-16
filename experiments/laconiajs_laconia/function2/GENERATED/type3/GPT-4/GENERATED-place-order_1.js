const laconia = require("@laconia/core");
const apigw = require("@laconia/adapter-api");
const config = require("@laconia/config");
const lambdaWarmer = require("@laconia/middleware-lambda-warmer");
const xray = require("@laconia/xray");
const pino = require("pino");
const ValidationError = require("./ValidationError");
const DynamoDbOrderRepository = require("./DynamoDbOrderRepository");
const KinesisOrderStream = require("./KinesisOrderStream");
const UuidIdGenerator = require("./UuidIdGenerator");

async function placeOrder({ newOrder, headers }, { orderRepository, orderStream, idGenerator, apiKey, restaurants, enabled }) {
  const logger = pino({ name: "place-order" });
  logger.info(`Placing order: ${JSON.stringify(newOrder)}`);
  
  // Validate API Key
  if (headers.authorization !== apiKey) {
    logger.error(`Invalid API Key: ${headers.authorization}`);
    throw new ValidationError("Invalid API Key");
  }

  // Check if order placement is enabled
  if (!enabled) {
    logger.error("Order placement is currently disabled");
    throw new Error("Order placement is currently disabled");
  }

  // Validate restaurant id
  if (!restaurants.includes(newOrder.order.restaurantId)) {
    logger.error(`Invalid restaurant Id: ${newOrder.order.restaurantId}`);
    throw new ValidationError("Invalid restaurant Id");
  }

  // Create a new order
  const orderId = idGenerator.generate();
  const order = { ...newOrder.order, orderId };
  
  // Save the order
  await orderRepository.save(orderId, order);

  // Publish order event
  await orderStream.send({
    orderId,
    eventType: "placed",
    restaurantId: order.restaurantId
  });

  logger.info(`Order placed successfully: ${orderId}`);
  return { orderId };
}

const laconiaHandler = laconia(app)
  .config(config)
  .register(xray.tracerInstance({ withLogging: { logger: pino } }))
  .middlewares([
    lambdaWarmer(),
    apigateway.inputs(request => [
      { apiKey: request.headers.Authorization, ...request.body },
      request.headers
    ])
  ]);

exports.handler = laconiaHandler;