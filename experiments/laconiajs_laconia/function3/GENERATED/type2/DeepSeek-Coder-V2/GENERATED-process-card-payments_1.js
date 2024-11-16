// File: /process-card-payments-batch.js

const laconia = require('@laconia/core');
const laconiaBatch = require('@laconia/batch');
const laconiaInvoker = require('@laconia/invoker');
const laconiaXray = require('@laconia/xray');
const AWS = require('aws-sdk');

// Environment variables
const ORDER_TABLE_NAME = process.env.ORDER_TABLE_NAME;

// Laconia invoker setup
const invoker = laconiaInvoker({
  captureCardPayment: {
    functionName: process.env.CAPTURE_CARD_PAYMENT_FUNCTION_NAME,
    fireAndForget: true
  }
});

// DynamoDB client setup
const dynamoDb = new AWS.DynamoDB.DocumentClient();

// Main function handler
exports.handler = laconia(async (event, laconiaContext) => {
  const batchProcessor = laconiaBatch.dynamoDb(dynamoDb, {
    tableName: ORDER_TABLE_NAME,
    itemsPerSecond: 2 // Process 2 items per second
  });

  batchProcessor.on("item", async (item) => {
    const paymentReference = item.paymentReference;
    if (!paymentReference) {
      console.warn(`Payment reference missing for order: ${item.orderId}`);
      return;
    }

    try {
      await invoker.captureCardPayment({ paymentReference });
      console.log(`Triggered payment capture for order: ${item.orderId}`);
    } catch (error) {
      console.error(`Failed to trigger payment capture for order: ${item.orderId}`, error);
    }
  });

  await batchProcessor.process();
}).register(invoker.envVarInstances())
  .postProcessor(laconiaXray.postProcessor());