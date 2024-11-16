// @ts-check
const laconia = require("@laconia/core");
const apiAdapter = require("@laconia/adapter-api");
const config = require("@laconia/config");
const xray = require("@laconia/xray");
const warmer = require("@laconia/middleware-lambda-warmer");
const DynamoDbOrderRepository = require("./DynamoDbOrderRepository");
const KinesisOrderStream = require("./KinesisOrderStream");
const ValidationError = require("./ValidationError");
const UuidIdGenerator = require("./UuidIdGenerator");
const pino = require("pino");

const instanceFactory = () => ({
  orderRepository: new DynamoDbOrderRepository(),
  orderStream: new KinesisOrderStream(),
  idGenerator: new UuidIdGenerator(),
  apiKey: process.env.API_KEY,
  restaurants: process.env.RESTAURANTS.split(","),
  enabled: process.env.ENABLED === 'true'
});


const app = async ({orderRepository, orderStream, idGenerator, apiKey, restaurants, enabled}, {headers, newOrder}) => {
  const authHeader = headers.authorization;
  if (authHeader !== apiKey) {
    throw new ValidationError("Invalid API Key");
  }

  if (!enabled) {
    throw new Error("Order placement is currently disabled.");
  }

  const restaurantId = newOrder.order.restaurantId;
  if (!restaurants.includes(restaurantId.toString())) {
    throw new ValidationError("Invalid restaurant id");
  }

  const orderId = idGenerator.generate();
  const newOrderData = { 
    id: orderId,
    ...newOrder.order
  };
  // Persist order details in database
  await orderRepository.save(newOrderData);

  // Publish an event to Kinesis for further downstream processing
  await orderStream.send({
    eventType: "order placed",
    orderId,
    restaurantId
  });

  // Return the new order ID in response
  return { orderId };
};


exports.handler = laconia(app).register(instanceFactory, warmer())
  // Attach API Gateway adapter
  .register(apiAdapter())
  .register(warmer())
  // Attach configuration manager()
  .register(config.ssm())
  // Attach X-Ray for AWS request tracing
  .postProcessor(xray.postProcessor({ logger: pino() }));