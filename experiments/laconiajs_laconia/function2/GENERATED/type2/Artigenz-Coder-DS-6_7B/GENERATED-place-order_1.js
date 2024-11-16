const { ValidationError } = require('./ValidationError');
const { UuidIdGenerator } = require('./UuidIdGenerator');
const { DynamoDbOrderRepository } = require('./DynamoDbOrderRepository');
const { KinesisOrderStream } = require('./KinesisOrderStream');
const pino = require('pino')(); // Assuming we are using pino logger

exports.handler = async ({ newOrder, headers, dependencies }) => {
  const { apiKey, restaurants, enabled } = dependencies;
  
  // Input Validation
  if (!headers ||!headers['Authorization'] || headers['Authorization']!== `Bearer ${apiKey}`) {
    throw new Error("Unauthorized");
  }

  if(!enabled){
    throw new Error("Order Placement Disabled");
  }

  if (!newOrder ||!newOrder.order ||!restaurants.includes(newOrder.restaurantId)) {
    throw new ValidationError("Invalid Order Data");
  }

  // Generate Unique Order Id
  const idGenerator = new UuidIdGenerator();
  const orderId = idGenerator.generateUUID();

  // Construct Complete Order Object
  let order = {...newOrder, orderId };

  // Save Order To DynamoDB
  const orderRepository = new DynamoDbOrderRepository();
  await orderRepository.save(order);

  // Publish Order Event To Kinesis Stream
  const orderStream = new KinesisOrderStream();
  orderStream.send({
      PartitionKey: orderId,
      Data: Buffer.from(JSON.stringify(order), 'utf8'),
  });

  // Return Order Id To Client
  return { orderId };
};