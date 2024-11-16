// Importing required modules
const laconia = require("@laconia/core");
const spy = require("@laconia/test").spy;

// 'captureCardPayment' function
// This function takes an event object as argument with a 'paymentReference' property
// and validates the input, throwing an error if 'paymentReference' is not present.
const captureCardPayment = async event => {
  if (!event.paymentReference) {
    throw new Error("Missing payment reference");
  }

  // The actual functionality of capturing the payment is not described in the function.
  // We assume it's performed elsewhere in the system, as a reaction to this function
  // being called, which would need to be the case for this function to be meaningful.
};

// Exporting setup
// This exports the function wrapped in a Laconia handler and a spy.
// Laconia's dependency injection capabilities are available even though they are not being used in this function.
// The spy lot is used to test that the function is being called correctly.
module.exports.handler = laconia(spy(captureCardPayment));