// @ts-check
const laconia = require("@laconia/core");
const api = require("@laconia/adapter-api");
const config = require("@laconia/config");
const xray = require("@laconia/xray");
const lambdaWarmer = require("@laconia/middleware-lambda-warmer");
const DynamoDbOrderRepository = require("./DynamoDbOrderRepository");
const KinesisOrderStream = require("./KinesisOrderStream");
const UuidIdGenerator = require("./UuidIdGenerator");
const ValidationError = require("./ValidationError");
const pino = require("pino")();

// Configuration for Laconia
const app = async (event, { orderRepository, orderStream, idGenerator, apiKey, restaurants, enabled }) => {
  // Validate API Key
  if (event.headers.authorization !== apiKey) {
    throw new ValidationError("Invalid API Key");
  }

  // Check if order placement is enabled
  if (!enabled) {
    throw new Error("Order placement is currently disabled");
  }

  // Validate Restaurant ID
  const restaurantId = event.newOrder.restaurantId;
  if (!restaurants.includes(restaurantId)) {
    throw new ValidationError("Invalid Restaurant ID");
  }

  // Generate unique order ID
  const orderId = idGenerator.generate();

  // Construct the complete order object
  const order = {
    orderId,
    ...event.newOrder.order
  };

  // Persist the order data to DynamoDB
  await orderRepository.save(order);

  // Publish "order placed" event to Kinesis
  await orderStream.send({
    orderId,
    restaurantId
  });

  // Return the newly generated orderId
  return { orderId };
};

// Laconia handler configuration
exports.handler = laconia(api.input(app))
  .register(
    config.envVarInstances({
      orderRepository: DynamoDbOrderRepository,
      orderStream: KinesisOrderStream,
      idGenerator: UuidIdGenerator,
      apiKey: "API_KEY",
      restaurants: "RESTAURANTS",
      enabled: "ENABLED"
    })
  )
  .postProcessor(xray.postProcessor())
  .use(lambdaWarmer());

// Error handling middleware
exports.handler = exports.handler.use(
  laconia.middleware((app) => async (event, context) => {
    try {
      return await app(event, context);
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: error.message })
        };
      } else {
        pino.error(error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: "Internal Server Error" })
        };
      }
    }
  })
);