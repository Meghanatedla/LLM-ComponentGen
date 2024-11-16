// Ensure the necessary dependencies are imported
const { spy } = require('@laconia/test');

// Define the capture card payment function
const captureCardPayment = async (event) => {
    // Validate the input event object
    if (!event || !event.paymentReference) {
        throw new Error('Invalid input. Missing paymentReference property.');
    }

    // Core logic for initiating the payment capture process based on the provided input
    // This function is designed to be tested using spies from "@laconia/test"
    // The actual payment capture mechanism might be triggered downstream or by other services

    // No explicit return value as the function's main role is to initiate payment capture

    // Potential logging of paymentReference or other relevant information for auditing or debugging
};

// Wrap the function with spies for testing purposes
module.exports = {
    captureCardPayment: spy(captureCardPayment)
};