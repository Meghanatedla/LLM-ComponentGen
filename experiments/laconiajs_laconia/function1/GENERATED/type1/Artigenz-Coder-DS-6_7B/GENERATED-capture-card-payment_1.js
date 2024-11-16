const { createHandler } = require('@laconia/core');

module.exports = createHandler(async ({ event }) => {
    // Input Validation
    if (!event ||!event.paymentReference) {
        throw new Error("Invalid request payload");
    }
    
    // Logic to initiate payment capture
    const paymentReference = event.paymentReference;
    console.log(`Initiating payment capture for ${paymentReference}...`);
  
    // Placeholder for actual payment capture logic
    // await someService.capturePayment(paymentReference);
});