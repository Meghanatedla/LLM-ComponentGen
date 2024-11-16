// Function to process card payments in batches from a DynamoDB table using Laconia framework

const AWS = require('aws-sdk');
const laconia = require('@laconia/core');
const batch = require('@laconia/batch');
const invoker = require('@laconia/invoker');
const xray = require('@laconia/xray');

const docClient = new AWS.DynamoDB.DocumentClient();
const ORDER_TABLE_NAME = process.env.ORDER_TABLE_NAME;

const captureCardPaymentInvoker = invoker.createHttp({
  url: process.env.CAPTURE_CARD_PAYMENT_URL,
  fireAndForget: true
});

const paymentProcessingFunction = laconia(batch(async ({ items }) => {
  for (const item of items) {
    const paymentReference = item.paymentReference;
    await captureCardPaymentInvoker({ paymentReference });
  }
}));

const laconiaBatch = batch.configure({
  itemsPerSecond: 2
});

const paymentProcessingFunctionWithBatch = laconiaBatch
  .use(laconiaBatch.dynamoDb(docClient))
  .use(laconiaBatch.xray(xray.postProcessor()))
  .register(invoker.envVarInstances())
  .on('item', paymentProcessingFunction);

module.exports = {
  paymentProcessingFunctionWithBatch
};