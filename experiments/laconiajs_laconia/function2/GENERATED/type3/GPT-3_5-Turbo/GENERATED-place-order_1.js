// @ts-check
const laconia = require("@laconia/core");
const { api } = require("@laconia/adapter-api");
const config = require("@laconia/config");
const xray = require("@laconia/xray");

const DynamoDbOrderRepository = require("./DynamoDbOrderRepository");
const KinesisOrderStream = require("./KinesisOrderStream");
const UuidIdGenerator = require("./UuidIdGenerator");
const ValidationError = require("./ValidationError");
const pino = require("pino");

exports.placeOrderHandler = async ({ newOrder, headers, orderRepository, orderStream, idGenerator, apiKey, restaurants, enabled }) => {
    // Input validation
    if (!headers.authorization || headers.authorization !== apiKey) {
        throw new ValidationError("Authorization failed. Invalid API Key.");
    }
    if (!restaurants.includes(newOrder.order.restaurantId)) {
        throw new ValidationError("Invalid restaurant ID.");
    }
    if (!enabled) {
        throw new Error("Order placement functionality is disabled.");
    }

    // Generate unique orderId
    const orderId = idGenerator.generate();

    // Construct order object
    const order = {
        ...newOrder.order,
        orderId
    };

    // Save order to DynamoDB
    await orderRepository.save(order);

    // Publish "order placed" event
    await orderStream.send({ orderId, restaurantId: order.restaurantId });

    return { orderId };
};

exports.handler = laconia(api(exports.placeOrderHandler))
    .register(config.fromEnvironmentVariables())
    .use(xray);