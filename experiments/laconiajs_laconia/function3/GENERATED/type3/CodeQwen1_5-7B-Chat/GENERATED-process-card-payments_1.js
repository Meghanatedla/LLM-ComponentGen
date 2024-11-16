// @ts-check
const laconia = require('@laconia/core');
const { fireAndForget } = require('@laconia/invoker');
const xray = require('@laconia/xray');
const { dynamoDb } = require('@laconia/batch');
const { envVarInstances } = require('@laconia/config');
const captureCardPayment = require('./capture-card-payment');

exports.app = async (items, { captureCardPayment }) => {
  const dynamoDbScan = dynamoDb.scan({
    tableName: 'ORDER_TABLE_NAME', // Assuming ORDER_TABLE_NAME is an environment variable
    limit: 10, // Example limit, adjust according to requirements
  });

  const batchConfig = {
    itemsPerSecond: 2, // Adjust based on performance requirements
    concurrency: 1, // Adjust based on concurrency requirements
    onItem: async (item) => {
      await fireAndForget(() => captureCardPayment(item.paymentReference));
    },
  };

  const processedItems = await dynamoDbScan(items, batchConfig);
  return processedItems;
};

const handler = laconia(exports.app)
 .register(envVarInstances())
 .postProcessor(xray.postProcessor());

exports.handler = handler;