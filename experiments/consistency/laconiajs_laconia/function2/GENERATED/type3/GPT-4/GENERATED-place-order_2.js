// @ts-check
const laconia = require("@laconia/core");
const apiAdapter = require("@laconia/adapter-api");
const config = require("@laconia/config");
const xray = require("@laconia/xray");
const warmer = require("@laconia/middleware-lambda-warmer");
const DynamoDbOrderRepository = require("./DynamoDbOrderRepository");
const KinesisOrderStream = require("./KinesisOrderStream");
const UuidIdGenerator = require("./UuidIdGenerator");
const ValidationError = require("./ValidationError");
const pino = require("pino");
const logger = pino();

exports.handler = laconia(apiAdapter(async ({ newOrder, headers }, { orderRepository, orderStream, idGenerator, apiKey, restaurants, enabled }) => {

  // Validate API Key
  if (headers.authorization !== apiKey) {
    throw new ValidationError("Invalid API Key");
  }

  // Check if the service is enabled
  if (!enabled) {
    throw new Error("Order placement is currently disabled");
  }

  // Validate restaurant ID
  if (!restaurants.includes(newOrder.order.restaurantId)) {
    throw new ValidationError("Invalid restaurant ID");
  }

  // Generate unique order ID
  const orderId = idGenerator.id();

  // Construct order object
  const order = {
    ...newOrder.order,
    orderId
  };

  // Save order to DynamoDB
  await orderRepository.save(order);

  // Publish order placed event to Kinesis
  await orderStream.send("order_placed", { orderId, restaurantId: newOrder.order.restaurantId });

  logger.info({orderId}, "New order placed");

  // Return order ID to client
  return { orderId };

})).register(
  config.envVarInstances({
    orderRepository: DynamoDbOrderRepository,
    orderStream: KinesisOrderStream,
    idGenerator: UuidIdGenerator
  })
).postProcessor(xray.postProcessor()).middleware(warmer());