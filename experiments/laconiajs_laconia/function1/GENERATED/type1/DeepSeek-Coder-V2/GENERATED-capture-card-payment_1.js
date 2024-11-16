const laconia = require('@laconia/core');
const { spy } = require('@laconia/test');

// Function to capture card payment
const captureCardPayment = async (event) => {
  // Validate the presence of paymentReference in the event object
  if (!event.paymentReference) {
    throw new Error('Payment reference is missing');
  }

  // Placeholder for the actual payment capture logic
  // This should be implemented by integrating with a payment service
  // For example: await paymentService.capturePayment(event.paymentReference);

  // For now, we just log the payment reference for demonstration purposes
  console.log(`Payment capture initiated for reference: ${event.paymentReference}`);
};

// Wrap the handler with Laconia and spies for testability
const handler = laconia(spy(captureCardPayment));

module.exports = { handler };