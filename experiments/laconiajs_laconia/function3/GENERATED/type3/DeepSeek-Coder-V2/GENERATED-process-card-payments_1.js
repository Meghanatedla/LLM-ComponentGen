// @ts-check
const laconia = require("@laconia/core");
const laconiaBatch = require("@laconia/batch");
const invoker = require("@laconia/invoker");
const xray = require("@laconia/xray");
const { DynamoDB } = require("aws-sdk");

// Assuming the environment variable ORDER_TABLE_NAME is set to the DynamoDB table name
const ORDER_TABLE_NAME = process.env.ORDER_TABLE_NAME;

// Function to process each item in the batch
const processItem = async (item, { captureCardPayment }) => {
  const paymentReference = item.paymentReference;
  if (paymentReference) {
    await captureCardPayment.fireAndForget({ paymentReference });
  }
};

// Laconia batch configuration for DynamoDB scan
const batchProcessor = laconiaBatch.dynamoDb(
  new DynamoDB.DocumentClient(),
  ORDER_TABLE_NAME,
  { itemsPerSecond: 2 }
);

// Laconia handler configuration
const handler = laconia(batchProcessor)
  .register(invoker.envVarInstances())
  .postProcessor(xray.postProcessor());

// Register the item processing logic
handler.on("item", processItem);

// Export the handler
exports.handler = handler;