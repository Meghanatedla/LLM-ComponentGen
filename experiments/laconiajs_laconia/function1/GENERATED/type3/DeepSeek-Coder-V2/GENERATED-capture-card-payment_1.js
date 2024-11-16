// @ts-check
const laconia = require("@laconia/core");
const { spy } = require("@laconia/test");

const validatePaymentReference = (event) => {
  if (!event.paymentReference) {
    throw new Error("Missing paymentReference in event");
  }
};

exports.app = async (event) => {
  validatePaymentReference(event);
  // The actual payment capture logic is expected to be handled downstream.
  // This function acts as a trigger and validation layer.
};

const handler = laconia(spy(exports.app));

exports.handler = handler;