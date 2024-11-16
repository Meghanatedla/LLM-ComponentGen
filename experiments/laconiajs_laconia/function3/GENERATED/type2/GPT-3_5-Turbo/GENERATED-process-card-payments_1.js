// Import necessary modules
const { instances, batch, xray } = require('@laconia/core');
const { envVarInstances } = require('@laconia/invoker');
const { dynamoDb, laconiaBatch } = require('@laconia/batch');
const { postProcessor } = require('@laconia/xray');
const AWS = require('aws-sdk');

// AWS SDK configuration
const dynamoDbClient = new AWS.DynamoDB.DocumentClient();

// Define the function to process card payments in batches
const processCardPayments = instances(async ({}) => {
  return batch({
    ...laconiaBatch,
    dynamoDb: dynamoDb(dynamoDbClient),
    itemsPerSecond: 2, // Process 2 items per second to control throughput
    handlers: envVarInstances(), // Use environment variables to resolve invoked functions
    postProcessor: postProcessor(), // Enable X-Ray tracing for monitoring
  }).on("item", async ({ paymentReference }) => {
    // Asynchronously invoke the captureCardPayment function with the payment reference
    await handlers.captureCardPayment({ paymentReference });
  });
});

// Export the function for use in the system
module.exports = processCardPayments;