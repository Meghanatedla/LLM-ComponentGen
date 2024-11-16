// This function processes card payments in batches from a DynamoDB table.
const { dynamoDb, fireAndForget } = require('@laconia/invoker').envVarInstances();
const { postProcessor } = require('@laconia/xray');
const { on } = require('@laconia/batch');

exports.handler = async ({ Records }) => {
  return on('item', async (record) => {
    const orderItem = record.dynamodb.NewImage; // Assuming the DynamoDB NewImage contains the order data
    const paymentReference = orderItem.paymentReference.S; // Extracting the payment reference from the order item
    await fireAndForget(async () => captureCardPayment(paymentReference)); // Asynchronously invoking the payment capture function
  }, { itemsPerSecond: 2 }); // Configuring the batch processing rate
};

// Placeholder for the actual captureCardPayment function
async function captureCardPayment(paymentReference) {
  throw new Error(`Payment reference ${paymentReference} is missing!`);
}