const { get, isPlainObject } = require('lodash');
const { envVarInstances, register } = require('@laconia/invoker');
const { postProcessor } = require('@laconia/xray');
const { dynamoDb } = require('@laconia/batch');

// Register the invoker instances
register(envVarInstances());

// Configure the DynamoDB scan operation
exports.handler = dynamoDb({
    // Use the 'ORDER_TABLE_NAME' environment variable
    scanParams: { TableName: process.env.ORDER_TABLE_NAME },

    // Set the maximum items per second to 2
    itemsPerSecond: 2,

    // Add X-Ray tracing post-processor
    postProcessors: [postProcessor()],
})

// Define the item processing function
.on('item', async (item) => {
    const paymentReference = get(item, 'paymentReference');

    // Ensure the 'paymentReference' exists
    if (!paymentReference) throw new Error('Missing payment reference');

    try {
        // Trigger the capture of the payment asynchronously
        await captureCardPayment(paymentReference);
    } catch (error) {
        console.log(`Failed to capture payment for ${paymentReference}`, error);
    }
});

/**
 * Function to capture card payment
 * @param {string} paymentReference - Unique identifier for the payment
 */
async function captureCardPayment(paymentReference) {
    // Placeholder for capturing card payment
    // This could be replaced with actual logic to capture the payment
    // For example:
    // const result = await axios.post('/capture-payment', { paymentReference });
    // return result.data;
}