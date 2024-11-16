const laconia = require("@laconia/core");
const { spy } = require("@laconia/test");

/*
This function validates the input event object and throws an error if it does not contain a valid paymentReference property. 
This function is wrapped within a spy to allow for capturing and later assertions in test scenarios. 
Note: This function presently does not handle the actual process of capturing the card payment. 
This will likely occur downstream in the application logic - either within a service that's triggered by this function or as a side effect of calling this function.
*/
const captureCardPaymentHandler = spy(async ({ paymentReference }) => {
  if (!paymentReference) throw new Error("paymentReference is missing");
  // Further business logic for capturing the card payment would potentially be implemented here
});

/*
The handler function is exported wrapped in the spy function provided by the `@laconia/test` package and the adapter from the `@laconia/core` package.
The 'spy' function records calls to the function wrapped inside it, allowing for further assertions in testing.
The 'adapter' wraps the original handler function and is responsible for converting incoming AWS Lambda events into parameters that are easier to handle within the application. It also handles returning correctly formatted responses and errors to AWS Lambda.
*/
module.exports.handler = laconia(captureCardPaymentHandler);