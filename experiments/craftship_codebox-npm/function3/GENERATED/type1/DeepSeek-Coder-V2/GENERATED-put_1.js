const AWS = require('aws-sdk');
const S3 = require('../adapters/s3');
const Logger = require('../adapters/logger');

module.exports.handler = async (event, context, callback) => {
    const { requestContext, body, pathParameters } = event;
    const { username } = requestContext.authorizer;
    const { name: packageName, tag } = pathParameters;
    const { version } = JSON.parse(body);

    const s3 = new S3({
        region: process.env.CODEBOX_REGION,
        bucket: process.env.CODEBOX_BUCKET
    });

    const logger = new Logger({
        logTopic: process.env.CODEBOX_LOG_TOPIC,
        username,
        packageName
    });

    try {
        // Fetch the existing index.json file from S3
        const indexJson = await s3.getObject(`${packageName}/index.json`);
        const packageData = JSON.parse(indexJson.Body.toString('utf-8'));

        // Update the dist-tags with the new version
        if (!packageData['dist-tags']) {
            packageData['dist-tags'] = {};
        }
        packageData['dist-tags'][tag] = version;

        // Save the updated index.json back to S3
        await s3.putObject(`${packageName}/index.json`, JSON.stringify(packageData, null, 2));

        // Log the update operation
        logger.info(`Updated dist-tag '${tag}' for package '${packageName}' to version '${version}'`);

        // Return success response
        callback(null, {
            statusCode: 200,
            body: JSON.stringify({
                ok: true,
                id: packageName,
                'dist-tags': packageData['dist-tags']
            })
        });
    } catch (error) {
        // Log the error and return a failure response
        logger.error(`Failed to update dist-tag '${tag}' for package '${packageName}': ${error.message}`);
        callback(null, {
            statusCode: 500,
            body: JSON.stringify({
                ok: false,
                error: error.message
            })
        });
    }
};