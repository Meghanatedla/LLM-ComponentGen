const laconia = require('@laconia/core');
const laconiaBatch = require('@laconia/batch');
const laconiaInvoker = require('@laconia/invoker');
const laconiaXray = require('@laconia/xray');
const AWS = require('aws-sdk');

// Environment variables
const ORDER_TABLE_NAME = process.env.ORDER_TABLE_NAME;

// Initialize DynamoDB client
const dynamoDb = new AWS.DynamoDB.DocumentClient();

// Function to capture card payment asynchronously
const captureCardPayment = laconiaInvoker.fireAndForget(
  laconiaInvoker.envVarInstances()
);

// Main function to process card payments in batches
const processCardPayments = async (event, laconiaContext) => {
  // Configure DynamoDB scan operation
  const scanConfig = {
    TableName: ORDER_TABLE_NAME,
    ProjectionExpression: 'paymentReference'
  };

  // Configure Laconia Batch for DynamoDB scan
  const batchProcessor = laconiaBatch.dynamoDb(scanConfig, { itemsPerSecond: 2 });

  // Register invokers
  batchProcessor.register(laconiaInvoker.envVarInstances());

  // Add X-Ray post-processor for tracing
  batchProcessor.postProcessor(laconiaXray.postProcessor());

  // Process each item in the batch
  batchProcessor.on("item", async (item) => {
    const { paymentReference } = item;
    await captureCardPayment(paymentReference);
  });

  // Start batch processing
  await batchProcessor.process();
};

// Export the Laconia handler
exports.handler = laconia(processCardPayments);