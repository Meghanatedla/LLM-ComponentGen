// @ts-check
const laconia = require("@laconia/core");
const invoker = require("@laconia/invoker");
const batch = require("@laconia/batch");
const xray = require("@laconia/xray");

const ORDER_TABLE_NAME = process.env.ORDER_TABLE_NAME || "defaultOrderTable";
const CAPTURE_CARD_PAYMENT_FUNCTION_NAME = process.env.CAPTURE_CARD_PAYMENT_FUNCTION_NAME || "captureCardPayment";

const instances = ({ invoker }) => ({
  batch
});

const laconiaBatch = invoker.laconiaBatch();
const laconiaInvoker = invoker.laconiaInvoker();

const processCardPayment = async items => {
  items.forEach(async item => {
    const { paymentReference } = item;
    await laconiaInvoker.invoke(instances.invoker, CAPTURE_CARD_PAYMENT_FUNCTION_NAME, { paymentReference });
  });
};

exports.app = async () => {
  await laconiaBatch.dynamoDb(ORDER_TABLE_NAME)
    .itemsPerSecond(2)
    .register(instances.batch)
    .on("item", processCardPayment)
    .execute();
};

exports.handler = laconia(exports.app).postProcessor(xray.postProcessor());