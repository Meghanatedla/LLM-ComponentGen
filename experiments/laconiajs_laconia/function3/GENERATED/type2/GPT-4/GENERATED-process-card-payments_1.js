const laconia = require("@laconia/core");
const AdapterDynamoDb = require("@laconia/adapter-dynamodb");
const config = require("@laconia/config");
const xray = require("@laconia/xray");
const invoker = require("@laconia/invoker");
const batch = require("@laconia/batch");
const AWS = require("aws-sdk");

const dynamodb = new AWS.DynamoDB();

exports.handler = laconia(
  batch(AdapterDynamoDb.scan(dynamodb, process.env.ORDER_TABLE_NAME))
    // Configure batch processing rate
    .register(config.fromEnvironment())
    .batchConfiguration({ itemsPerSecond: 2 })
    // Register the invoker to be used within the batch processing pipeline
    .register(invoker.envVarInstances())
    // Add X-Ray tracing
    .postProcessor(xray.postProcessor())
    // Process each item
    .on("item", ({ captureCardPayment }, order) => {
      if (!order.paymentReference) {
        console.log(`Order ${order.orderId} is missing payment reference.`);
        // Handle MissingPaymentReferenceError appropriately or ignore, based on your needs
        return;
      }
      // Prepare payment capture arguments
      const args = { PaymentReference: order.paymentReference };
      // Invoke the "captureCardPayment" function with fireAndForget
      return captureCardPayment.fireAndForget(args)
        .catch(err => console.log(`Error capturing payment for order ${order.orderId}: ${err}`));
    })
);