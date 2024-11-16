'use strict';

const { S3Adapter, LoggerAdapter } = require('../adapters');
const { environment, requestContext } = require('../config');

const updateDistTag = (event, context, callback) => {
  const { requestContext } = event;
  const { body, pathParameters } = event;
  const { name, tag } = pathParameters;

  // Initialize S3 and Logger instances
  const s3 = new S3Adapter(environment.bucket, environment.region);
  const logger = new LoggerAdapter(environment.logTopic);

  // Extract necessary information from event object
  const version = JSON.parse(body).version;

  // Try block for error handling
  try {
    // Fetch the existing index.json file from S3
    const file = await s3.getFile('index.json');

    // Parse the JSON content
    const indexJson = JSON.parse(file);

    // Update the dist-tags entry
    indexJson.versions[version].dist = {
      shasum: indexJson.versions[version].dist.shasum,
      tarball: `https://s3-${environment.region}.amazonaws.com/${environment.bucket}/${name}/-/${name}-${version}.tgz`,
    };
    if (!indexJson.distTags) indexJson.distTags = {};
    indexJson.distTags[tag] = version;

    // Save the modified index.json file to S3
    await s3.putFile('index.json', JSON.stringify(indexJson));

    // Log the update operation
    logger.info(`Updated dist-tag ${tag} for package ${name} to version ${version}`);

    // Return a success response
    callback(null, {
      statusCode: 200,
      body: JSON.stringify({ ok: true, id: name, distTags: indexJson.distTags }),
    });

  } catch (error) {
    // Log the error and return an error response
    logger.error(`Failed to update dist-tag for package ${name}: ${error.message}`);
    callback(null, {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: error.message }),
    });
  }
};

module.exports = updateDistTag;