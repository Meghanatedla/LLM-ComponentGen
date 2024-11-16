// @ts-check
const laconia = require("@laconia/core");
const apigateway = require("@laconia/adapter-api");
const laconiaConfig = require("@laconia/config");
const xray = require("@laconia/xray");
const lambdaWarmer = require("@laconia/middleware-lambda-warmer");
const pino = require("pino");

const DynamoDbOrderRepository = require("./DynamoDbOrderRepository");
const KinesisOrderStream = require("./KinesisOrderStream");
const ValidationError = require("./ValidationError.js");
const UuidIdGenerator = require("./UuidIdGenerator.js");

// Application logic
const app = ({ orderRepository, orderStream, idGenerator, enabled, apiKey, restaurants }, newOrder, headers) => {
  // Validate API key
  const providedApiKey = headers.Authorization;
  if (!providedApiKey || providedApiKey !== apiKey) {
    throw new ValidationError("Invalid API Key");
  }

  // Ensure the order placement functionality is enabled
  if (!enabled) {
    throw new Error("Order placement functionality is currently disabled.");
  }

  // Validate the restaurant
  const { restaurantId } = newOrder.order;
  if (!restaurants.includes(restaurantId)) {
    throw new ValidationError("Invalid Restaurant ID");
  }

  const orderId = idGenerator.generate();

  // Assemble order
  const order = {
    orderId,
    ...newOrder.order
  };

  return Promise.all([
    // Save to DynamoDB
    orderRepository.save(order),

    // Publish to Kinesis
    orderStream.send("orderPlaced", {
      orderId,
      restaurantId
    })
  ]).then(() => ({ orderId }));
};

// Prepare configurations for laconia instances
const config = laconiaConfig.envVarInstances({
  orderRepository: { dependencies: ["AWS_REGION"], factory: DynamoDbOrderRepository },
  orderStream: { dependencies: ["AWS_REGION"], factory: KinesisOrderStream },
  idGenerator: { factory: UuidIdGenerator }
});

// Apply middlewares
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

// Export the handler
exports.handler = laconiaHandler;