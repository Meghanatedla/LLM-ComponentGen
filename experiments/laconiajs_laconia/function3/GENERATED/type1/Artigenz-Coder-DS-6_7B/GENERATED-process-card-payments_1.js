import {
  createHandler,
  dynamodbStream,
  fireAndForget,
  handler,
} from "@laconia/core";
import { envVars } from "@laconia/environment-variables";
import { xray } from "@laconia/xray";
import { batch } from "@laconia/batch";

const ORDER_TABLE_NAME = envVars().getString("ORDER_TABLE_NAME");

// Define the type for the input event
interface InputEvent {
  Records: Array<{ dynamodb: { NewImage: { paymentReference: { S: string } } } }>;
}

export const main = createHandler({
  // Configure the DynamoDB stream source
  source: dynamodbStream<InputEvent>(),
  // Register the invoker instances
  register: fireAndForget({}),
  // Add X-Ray post processor
  postProcessor: xray.postProcessor(),
  // Configure the batch processing
  configureBatch: batch.config({ itemsPerSecond: 2 }),
  // Handle the incoming events
  async handle(event) {
    // Loop through each record in the event
    for (let record of event.Records) {
      // Extract the payment reference from the record
      let paymentReference = record.dynamodb.NewImage.paymentReference.S;
      
      // Invoke the captureCardPayment function asynchronously
      await invoke('captureCardPayment', { paymentReference });
    }
  },
});