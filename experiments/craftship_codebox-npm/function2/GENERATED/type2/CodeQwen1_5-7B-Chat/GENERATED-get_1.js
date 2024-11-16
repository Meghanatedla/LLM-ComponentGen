// Required third-party libraries
const S3 = require('./adapters/s3');
const npm = require('./adapters/npm');
const Logger = require('./adapters/logger');
const config = require('./config');

// Initializing S3 adapter
const s3 = new S3({
  region: config.s3.region,
  bucket: config.s3.bucket,
});

/**
 * Fetches the distribution tags for an npm package.
 * @param {object} requestContext - Request context containing authorization information.
 * @param {object} pathParameters - Parameters extracted from the request URL, including package name.
 * @param {object} context - AWS Lambda context object.
 * @param {function} callback - Callback function for returning the HTTP response.
 */
function getDistTags(requestContext, pathParameters, context, callback) {
  const { name } = pathParameters;

  // Constructing S3 key
  const s3Key = `${name}/index.json`;

  // Fetching package metadata from S3
  s3.get(s3Key)
    .then((s3Response) => {
      const { body } = s3Response;
      const data = JSON.parse(body);

      if (data.distTags) {
        // Sending dist-tags in the response
        callback(null, {
          statusCode: 200,
          body: JSON.stringify(data.distTags),
        });
      } else {
        throw new Error('S3 lookup did not return dist-tags');
      }
    })
    .catch((error) => {
      if (error.name === 'NoSuchKey') {
        // Package not found in S3, fetching from npm registry
        npm.package(config.registry, name)
          .then((npmResponse) => {
            const { dist } = npmResponse;

            if (dist && dist.tags) {
              // Sending dist-tags in the response
              callback(null, {
                statusCode: 200,
                body: JSON.stringify(dist.tags),
              });
            } else {
              // No dist-tags found in npm registry
              callback({ statusCode: 404, body: JSON.stringify({ error: 'No dist-tags found' }) });
            }
          })
          .catch((npmError) => {
            // Logging error and returning 500 status
            Logger.error(requestContext.authorizer.username, {
              stack: npmError.stack,
              message: 'Failed to fetch package metadata from npm registry',
            });
            callback({ statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) });
          });
      } else {
        // Logging error and returning 500 status
        Logger.error(requestContext.authorizer.username, {
          stack: error.stack,
          message: 'S3 interaction failed',
        });
        callback({ statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) });
      }
    });
}

module.exports = getDistTags;