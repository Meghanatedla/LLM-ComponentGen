// Import required modules
const { fireAndForget } = require('@laconia/invoker');
const { postProcessor } = require('@laconia/xray');
const { dynamoDb } = require('@laconia/batch');
const { xray } = require('@laconia/xray');

// Define the captureCardPayment function
const captureCardPayment = async (paymentReference) => {
  try {
    // Assume there's an external API call to capture the payment
    await externalApiCall(`${PAYMENT_SERVICE_URL}/capture/${paymentReference}`);

    console.log(`Successfully captured payment for reference ${paymentReference}`);
  } catch (error) {
    console.error(`Failed to capture payment for reference ${paymentReference}:`, error);
  }
};

// Mock the external API call for demonstration purposes
const externalApiCall = async (url) => {
  // Simulate an asynchronous operation
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() > 0.5) {
        resolve(); // Payment captured successfully
      } else {
        reject(new Error('Failed to capture payment')); // Payment capture failed
      }
    }, Math.random() * 1000); // Random delay simulating network latency
  });
};

// Register the captureCardPayment function with the invoker
const registerCaptureCardPaymentFunction = () => {
  const invoker = fireAndForget();
  invoker.register(captureCardPayment);
};

// Configure X-Ray tracing
const configureXRayTracing = () => {
  const xrayPostProcessor = postProcessor();
  xrayPostProcessor.add('captureCardPayment', 'process');
};

// Main function to orchestrate the batch processing
const main = async () => {
  // Initialize X-Ray tracing
  configureXRayTracing();

  // Scan the ORDER_TABLE_NAME for orders
  const dynamoScanConfig = dynamoDb({
    tableName: process.env.ORDER_TABLE_NAME,
  });

  // Configure batch processing with a rate limit of 2 items per second
  const batchConfig = { itemsPerSecond: 2 };

  // Register the captureCardPayment function with the invoker
  registerCaptureCardPaymentFunction();

  // Start the batch processing
  await laconiaBatch.dynamoDb(dynamoScanConfig, batchConfig).on('item', captureCardPayment);
};

// Execute the main function
main().catch(console.error);