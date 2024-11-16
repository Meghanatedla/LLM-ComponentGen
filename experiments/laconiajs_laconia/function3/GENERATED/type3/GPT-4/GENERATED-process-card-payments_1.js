// @ts-check
const laconiaBatch = require("@laconia/batch");
const laconia = require("@laconia/core");
const invoker = require("@laconia/invoker");
const xray = require("@laconia/xray");
const { ScanPaginator } = require("@aws-sdk/client-dynamodb");

exports.app = async ({captureCardPayment}, batch) => {
  for await (let item of batch) {
    if(item.paymentReference) { 
      await captureCardPayment.fireAndForget({paymentReference: item.paymentReference});
    } else {
      // You may not need to take any action if paymentReference is missing. Alternatively, you may
      // want to handle this scenario differently, for instance by logging an error or notifying an admin.
    }
  }
};

const instances = ({env}) => ({
  captureCardPayment: invoker.envVarInstances().captureCardPayment
});

const batch = laconiaBatch.dynamoDb(async ({dynamodb}, scanInput) => {
  const paginator = new ScanPaginator(dynamodb, {
    TableName: process.env.ORDER_TABLE_NAME,
    ...scanInput
  });
  const items = [];
  for await (const page of paginator) {
    items.push(...page.Items);
  }
  return items;
}, { itemsPerSecond: 2 });

exports.handler = laconia(batch(exports.app))
  .register(invoker.envVarInstances())
  .register(instances)
  .postProcessor(xray.postProcessor());