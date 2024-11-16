// capture-card-payment.js
const laconia = require('@laconia/core');
const adapterApi = require('@laconia/adapter-api');
const invoker = require('@laconia/invoker');
const xray = require('@laconia/xray');

exports.handler = laconia(adapterApi.apigateway())
 .register(invoker.envVarInstances())
 .postProcessor(xray.postProcessor())
 .on('request', ({ captureCardPayment }, event) => {
    const { paymentReference } = event.body;
    if (!paymentReference) {
      throw new Error('Missing payment reference');
    }
    captureCardPayment.fireAndForget({ paymentReference });
  });