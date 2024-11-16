// @ts-check
const laconia = require('@laconia/core');
const { spy } = require('@laconia/test');

/**
 * Initiates the capture of a card payment.
 *
 * @param {{ paymentReference }} event - The event object containing the payment reference.
 */
function captureCardPaymentHandler(event) {
  // Input validation
  if (!event ||!event.paymentReference) {
    throw new Error('Missing required parameter: paymentReference');
  }

  // Log the payment reference for auditing purposes
  console.log('Capturing payment for reference:', event.paymentReference);

  // Assume this is where we actually initiate the payment capture process...
  // For the sake of brevity, let's just return the payment reference instead.
  return event.paymentReference;
}

module.exports.handler = laconia(spy(captureCardPaymentHandler));