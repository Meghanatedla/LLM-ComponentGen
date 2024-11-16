// Assume this code is written within a new file named updateDistTags.js
const S3Adapter = require('../adapters/s3');
const Logger = require('../adapters/logger');

const updateDistTags = (requestContext, body, pathParameters, context, callback) => {
    const bucket = process.env.CODEBOX_BUCKET;
    const region = process.env.CODEBOX_REGION;
    const logTopic = process.env.LOG_TOPIC; // Assuming there is an environment variable for the log topic

    const s3 = new S3Adapter(bucket, region);
    const logger = new Logger(logTopic, requestContext);

    const packageName = pathParameters.name;
    const tag = pathParameters.tag;
    const version = body.version;

    try {
        // Fetch index.json file from S3
        const indexContent = s3.getObject(packageName + '/index.json');
        const indexData = JSON.parse(indexContent);

        // Update the dist-tags with the new version
        indexData['dist-tags'][tag] = version;

        // Save the updated index.json back to S3
        s3.putObject(packageName + '/index.json', JSON.stringify(indexData));

        // Log the update operation
        logger.info(`Updated dist-tags for package ${packageName} - ${tag}: ${version}`);

        // Return success response
        callback(null, {
            statusCode: 200,
            body: JSON.stringify({
                ok: true,
                id: packageName,
                distTags: indexData['dist-tags']
            })
        });
    } catch (error) {
        // Log any errors and return error response
        logger.error(`Error updating dist-tags for package ${packageName}: ${error.message}`);
        callback(null, {
            statusCode: 500,
            body: JSON.stringify({
                ok: false,
                error: error.message
            })
        });
    }
};

// Export the function for use in the Lambda handler
module.exports = updateDistTags;
