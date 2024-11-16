'use strict';

const S3 = require('../adapters/s3');
const Logger = require('../adapters/logger');

module.exports.handler = async (event, context, callback) => {
  // extract package name and tag from path parameters
  const { name, tag } = event.pathParameters;
  
  // parse request body to get new version
  const { version } = JSON.parse(event.body);
  
  // missing parameters
  if (!name || !tag || !version) {
    callback(null, { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Missing parameters.' }) });
    return;
  }

  // setup S3 bucket
  const s3 = new S3({
    region: process.env.CODEBOX_REGION,
    bucket: process.env.CODEBOX_BUCKET,
  });

  // setup logger
  const logger = new Logger({
    topic: process.env.CODEBOX_LOG_TOPIC,
    user: event.requestContext.authorizer.claims,
  });

  try {
    // fetch package metadata from S3
    const indexJson = await s3.get(`${name}/index.json`);
    if(!indexJson) {
      callback(null, { statusCode: 404, body: JSON.stringify({ ok: false, error: 'Package not found.' }) });
      return;
    }

    const data = JSON.parse(indexJson.Body.toString());

    // update tag with new version
    data['dist-tags'][tag] = version;
    
    // Save updated index.json back to S3 bucket.
    await s3.put(`${name}/index.json`, JSON.stringify(data));

    // Log the update operation.
    await logger.log(`Updated dist-tag ${tag} to version ${version} of package ${name}.`);

    // Return a success response.
    callback(null, {
      statusCode: 200,
      body: JSON.stringify({
          ok: true,
          id: name,
          'dist-tags': data['dist-tags'],
      }),
    });

  } catch (err) {
    // Log errors
    await logger.log(`Dist-tag update error for package ${name}: ${err.name}: ${err.message}`);

    // Return failure response
    callback(null, {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message }),
    });
  }
};