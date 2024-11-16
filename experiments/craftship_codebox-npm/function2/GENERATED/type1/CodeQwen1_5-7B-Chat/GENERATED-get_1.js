const npm = require('./npmAdapter');
const s3 = require('./s3Adapter');
const logger = require('./loggerAdapter');

module.exports.handle = (requestContext, pathParameters, context, callback) => {
  const packageName = pathParameters.name;
  const s3Key = `${packageName}/index.json`;
  const s3Bucket = process.env.bucket;
  const registryUrl = process.env.registry;

  const getFromS3 = async () => {
    try {
      const buffer = await s3.get(s3Key, s3Bucket, process.env.region);
      const data = JSON.parse(buffer.toString());
      return data.distTags;
    } catch (error) {
      if (error.code !== 'NoSuchKey') {
        logger.error(`S3 error occurred: ${error.message}`);
      }
      return null;
    }
  };

  const getFromRegistry = async () => {
    try {
      const data = await npm.package(registryUrl, packageName);
      return data.distTags;
    } catch (error) {
      logger.error(`Registry error occurred: ${error.message}`);
      return null;
    }
  };

  const sendResponse = (statusCode, body) => {
    callback(null, {
      statusCode,
      body: JSON.stringify(body),
    });
  };

  (async () => {
    let distTags = await getFromS3();
    if (!distTags) {
      distTags = await getFromRegistry();
    }
    if (distTags) {
      sendResponse(200, distTags);
    } else {
      sendResponse(404, { error: `Package '${packageName}' not found` });
    }
  })();
};