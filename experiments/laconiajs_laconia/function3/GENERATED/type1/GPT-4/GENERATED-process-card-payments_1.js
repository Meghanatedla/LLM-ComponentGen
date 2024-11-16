const AWS = require("aws-sdk");
const laconia = require("@laconia/core");
const laconiaBatch = require("@laconia/batch");
const invoker = require("@laconia/invoker");
const xray = require("@laconia/xray");

/** Fire & Forget Function */
const fireAndForgetPaymentCapture = async (captureCardPayment, paymentReference) => {
  
  // Here we assume that captureCardPayment is a function and it does not have a callback,
  // so it's executed in Fire & Forget mode.
  captureCardPayment(paymentReference);
};

/** Main function */
module.exports.handler = laconia(laconiaBatch.dynamoDb(
  new AWS.DynamoDB.DocumentClient().scan, 
  { 
    TableName: process.env.ORDER_TABLE_NAME 
  }
)
.itemsPerSecond(2)
.register(invoker.envVarInstances())
.postProcessor(xray.postProcessor())
.on("item", async ({ captureCardPayment }, order) => {
  
  // We assume that each item in the orders table includes a "paymentReference".
  // If this information is not present, you would need to handle this condition.
  if (!order.hasOwnProperty('paymentReference')) {
    console.warn("The order does not have a paymentReference", order);
    return;
  }
  
  // Ignore the order if the amount has not been settled yet.
  const paymentReference = order.paymentReference;
  
  await fireAndForgetPaymentCapture(captureCardPayment, paymentReference);
}));