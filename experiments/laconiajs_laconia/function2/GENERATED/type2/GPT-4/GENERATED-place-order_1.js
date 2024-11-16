// Import necessary dependencies
const laconia = require("@laconia/core");
const apiAdapter = require("@laconia/adapter-api");
const config = require("@laconia/config");

// Import custom classes
const DynamoDbOrderRepository = require("./DynamoDbOrderRepository");
const KinesisOrderStream = require("./KinesisOrderStream");
const UuidIdGenerator = require("./UuidIdGenerator");
const ValidationError = require("./ValidationError");

// Define handler function
const handler = laconia(apiAdapter(async (event, { orderRepository, orderStream, idGenerator, apiKey, restaurants, enabled }) => {
  const { newOrder, headers } = event;

  // Validate API Key
  if (headers["authorization"] !== apiKey) {
    throw new ValidationError("Invalid API Key");
  }

  // Check if order placement functionality is enabled
  if (!enabled) {
    throw new Error("Order placement is currently disabled. Please try again later.");
  }

  // Validate restaurant id
  if (!restaurants.includes(newOrder.restaurantId)) {
    throw new ValidationError("Invalid restaurant id");
  }

  const orderId = idGenerator.generate();

  // Create the order
  const order = {
    id: orderId,
    restaurantId: newOrder.restaurantId,
    items: newOrder.items,
    customerId: newOrder.customerId,
  };

  // Store order to DynamoDB
  await orderRepository.save(order);

  // Publish order event to Kinesis stream
  await orderStream.send({
    type: "orderPlaced",
    orderId: orderId,
    restaurantId: newOrder.restaurantId
  });

  // Return the newly created orderId
  return { orderId: orderId };

}));

// Define and export the laconia adapter
module.exports = laconia(handler)
  .register(config.envVarInstances({
    orderRepository: () => new DynamoDbOrderRepository(),
    orderStream: () => new KinesisOrderStream(),
    idGenerator: () => new UuidIdGenerator(),
    apiKey: process.env.API_KEY,
    restaurants: process.env.RESTAURANTS.split(","),
    enabled: process.env.ORDER_FUNC_ENABLED === "true"
  }))