const laconia = require("@laconia/core");
const { apigateway, response } = require("@laconia/adapter-api");
const { envVarInstances } = require("@laconia/config");
const { xray } = require("@laconia/xray");
const { DynamoDbOrderRepository } = require("./src/DynamoDbOrderRepository");
const { KinesisOrderStream } = require("./src/KinesisOrderStream");
const { UuidIdGenerator } = require("./src/UuidIdGenerator");
const { ValidationError } = require("./src/ValidationError");
const pino = require("pino");

const handler = async (
  {
    newOrder,
    headers: { authorization },
  },
  {
    orderRepository,
    orderStream,
    idGenerator,
    apiKey,
    restaurants,
    enabled,
  }
) => {
  const requestId = require("aws-lambda").context.invocationId;
  const logger = pino({ requestId });

  if (authorization !== apiKey) {
    throw new ValidationError("Invalid API Key");
  }
  
  if (!enabled) {
    throw new Error("Order placement is currently disabled");
  }
  
  const { restaurantId } = newOrder;

  if (!restaurants.includes(restaurantId)) {
    throw new ValidationError("Invalid Restaurant ID");
  }

  const orderId = idGenerator.generate();
  const order = {
    ...newOrder.order,
    orderId,
  };

  await orderRepository.save(order);

  await orderStream.placeOrder({
    orderId,
    restaurantId,
  });

  logger.info({ orderId }, "Order succesfully placed");

  return { orderId };
}

exports.handler = laconia(handler)
  .register(envVarInstances({
    orderRepository: DynamoDbOrderRepository,
    orderStream: KinesisOrderStream,
    idGenerator: UuidIdGenerator,
  }))
  .adapter(apigateway())
  .errorAdapter(apig($ => $.validate(ValidationError, response.badRequest)))
  .middlewares(xray())
  .register("orderId", async (_, { idGenerator }) => await idGenerator.generate());