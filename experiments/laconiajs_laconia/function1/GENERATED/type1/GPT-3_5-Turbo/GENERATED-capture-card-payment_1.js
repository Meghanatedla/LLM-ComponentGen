const { createEventProcessor, spy } = require('@laconia/test');

const captureCardPayment = () => {
  const handler = async (event) => {
    if (!event || !event.paymentReference) {
      throw new Error('Missing paymentReference in event');
    }

    // Logic to initiate the card payment capture process
    // This could involve calling external services or systems to capture the payment

    // No explicit return value as the core functionality revolves around triggering payment capture

    // Spy functions from @laconia/test can be used to record calls and parameters for testing purposes
  };

  return spy(handler);
};

module.exports.handler = createEventProcessor(captureCardPayment());
