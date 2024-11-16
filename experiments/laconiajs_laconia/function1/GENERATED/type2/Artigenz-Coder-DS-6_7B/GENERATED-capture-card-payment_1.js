const { register } = require('@laconia/core');
const { spy } = require('@laconia/test');

// Register a function named 'capture-card-payment'.
module.exports = register(({ event }) => {
    // Check if the event object contains a 'paymentReference' property.
    if (!event ||!event.hasOwnProperty('paymentReference')) {
        throw new Error("Missing 'paymentReference'");
    }
});

// Wrap the registered function with spy functions to enable recording call history and arguments.
module.exports = spy(module.exports);