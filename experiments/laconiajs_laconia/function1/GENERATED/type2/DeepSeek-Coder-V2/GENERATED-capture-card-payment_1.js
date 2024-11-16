// capture-card-payment.js

const laconia = require('@laconia/core');
const { spy } = require('@laconia/test');

// Function to capture card payment
const captureCardPayment = async (event) => {
  // Validate the presence of paymentReference in the event object
  if (!event.paymentReference) {
    throw new Error('Missing paymentReference in event');
  }

  // Placeholder for the actual payment capture logic
  // This should be implemented by integrating with a payment gateway or service
  // For example:
  // const paymentService = require('./paymentService');
  // await paymentService.capturePayment(event.paymentReference);

  // For now, just log the paymentReference for debugging purposes
  console.log(`Payment capture initiated for paymentReference: ${event.paymentReference}`);
};

// Wrap the handler with Laconia and spy for testing purposes
const handler = laconia(spy(captureCardPayment));

module.exports = { handler };