// capture-card-payment.js

const { register } = require('@laconia/core');
const { config } = require('@laconia/config');
const axios = require('axios');

class CaptureCardPayment {
  constructor(dynamoDbOrderRepository) {
    this.dynamoDbOrderRepository = dynamoDbOrderRepository;
  }

  async handler(event) {
    try {
      const paymentReference = event.paymentReference;
      if (!paymentReference) {
        throw new Error('Missing payment reference');
      }

      // Simulate initiating payment capture
      console.log(`Initiating payment capture for payment reference ${paymentReference}`);

      // Replace the following line with actual payment capture logic
      // await somePaymentCaptureService(paymentReference);

      // Log payment capture success
      console.log(`Payment capture successful for payment reference ${paymentReference}`);
    } catch (error) {
      // Handle payment capture failure
      console.error(`Failed to capture payment for payment reference ${paymentReference}: ${error.message}`);
    }
  }
}

module.exports = async () => {
  const dynamoDbOrderRepository = register({
    dynamoDbOrderRepository: ({ config }) => new DynamoDbOrderRepository(config.dynamoDbTableName),
  });

  return new CaptureCardPayment(dynamoDbOrderRepository);
};