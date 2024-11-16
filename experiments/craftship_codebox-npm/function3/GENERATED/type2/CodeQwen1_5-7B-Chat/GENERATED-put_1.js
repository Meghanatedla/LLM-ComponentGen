const AWS = require('aws-sdk');
const s3 = new AWS.S3({
  region: process.env.REGION,
});
const { Logger } = require('./adapters/logger');
const logger = new Logger(process.env.LOG_TOPIC);

exports.updateDistTag = (event, context, callback) => {
  const requestContext = event.requestContext;
  const { name, tag } = event.pathParameters;
  const { version } = JSON.parse(event.body);

  const s3Params = {
    Bucket: process.env.BUCKET,
    Key: `${name}/index.json`,
  };

  s3.getObject(s3Params, (err, data) => {
    if (err) {
      logger.error(err);
      callback(null, { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Failed to fetch package metadata' }) });
    } else {
      let packageData;
      try {
        packageData = JSON.parse(data.Body.toString());
      } catch (parseError) {
        logger.error(parseError);
        callback(null, { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Failed to parse package metadata' }) });
        return;
      }

      if (!packageData.versions[version]) {
        callback(null, { statusCode: 404, body: JSON.stringify({ ok: false, error: 'Version not found in package' }) });
        return;
      }

      packageData['dist-tags'][tag] = version;
      const updatedPackageData = JSON.stringify(packageData, null, 2);

      const updateS3Params = {
        ...s3Params,
        Body: updatedPackageData,
      };

      s3.putObject(updateS3Params, (updateErr) => {
        if (updateErr) {
          logger.error(updateErr);
          callback(null, { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Failed to update package metadata' }) });
        } else {
          logger.info(`Dist-tag '${tag}' updated for package '${name}' to version '${version}'`);
          callback(null, { statusCode: 200, body: JSON.stringify({ ok: true, distTags: packageData['dist-tags'], id: name }) });
        }
      });
    }
  });
};