// @ts-check
const laconia = require("@laconia/core");
const laconiaTest = require("@laconia/test");

// This handler function is designed to initiate the capture of a card payment.
// Assuming that the card payment capture process happens downstream, this function checks for the 
// presence of a 'paymentReference' in the 'event' object.
// The actual implementation function is wrapped with laconiaTest.spy() for enabling the test framework to
// assert on invocation and parameters. It is crucial for this function to receive a valid 'event' object with
// a 'paymentReference' property.
exports.handler = laconia(laconiaTest.spy(async (event, {invokee}) => {
  if (!event.paymentReference) {
    throw new Error("Payment reference is missing!");
  }

  // Assuming that downstream mechanisms to handle the payment capture process would be invoked here.
  // Since the actual capture mechanism is not part of this function, the actual implementation is not
  // detailed here.

  // Example:
  // await invokee({ paymentReference: event.paymentReference });

})).register(laconiaTest.spyInstances());
