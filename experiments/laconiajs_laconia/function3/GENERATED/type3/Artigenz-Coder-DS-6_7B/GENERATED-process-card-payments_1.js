// Import necessary libraries and modules
const laconia = require('@laconia/core');
const batch = require('@laconia/batch');
const xray = require('@laconia/xray');
const invoker = require('@laconia/invoker');
const aws = require('aws-sdk');

// Define the function to process card payments in batches
exports.processCardPaymentsInBatches = async (items) => {
  // Iterate over each item in the batch
  for (let item of items) {
    try {
      // Extract the payment reference from the item
      const paymentReference = item.paymentReference;
      
      // Call the 'captureCardPayment' function with the extracted payment reference
      await invoker.invoke('captureCardPayment', paymentReference);
    } catch (error) {
      console.log(`Failed to process payment for item ${JSON.stringify(item)}: ${error.message}`);
    }
  }
};

// Configure the Lambda handler to use the 'processCardPaymentsInBatches' function
const handler = laconia(batch.dynamoDb({
  tableName: process.env.ORDER_TABLE_NAME,
  on: ['ready'],
}))(exports.processCardPaymentsInBatches)
 .register(invoker.envVarInstances())
 .postProcessor(xray.postProcessor());

// Export the configured Lambda handler
module.exports.handler = handler;