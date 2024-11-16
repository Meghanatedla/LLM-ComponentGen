const npm = require('npm'); // Adapter module for interacting with the npm registry
const S3 = require('S3'); // Adapter module for interacting with Amazon S3
const Logger = require('Logger'); // Adapter module for logging errors

const { registry, bucket, region, logTopic } = process.env;

module.exports.handler = async (event, context, callback) => {
    const { requestContext, pathParameters } = event;
    const { name: packageName } = pathParameters;

    const s3Key = `${packageName}/index.json`;

    try {
        // Attempt to retrieve package metadata from S3
        const s3Response = await S3.get({
            Bucket: bucket,
            Key: s3Key,
            Region: region
        });

        // Parse the JSON from the retrieved buffer
        const packageMetadata = JSON.parse(s3Response.Body.toString('utf-8'));

        // Return the dist-tags from the package metadata
        callback(null, {
            statusCode: 200,
            body: JSON.stringify(packageMetadata['dist-tags'])
        });
    } catch (error) {
        if (error.code === 'NoSuchKey') {
            // If the S3 lookup fails with a NoSuchKey error, fetch from npm registry
            try {
                const npmResponse = await npm.package(registry, packageName);

                // Return the dist-tags from the npm registry data
                callback(null, {
                    statusCode: 200,
                    body: JSON.stringify(npmResponse['dist-tags'])
                });
            } catch (npmError) {
                // If the npm registry fetch fails, return a 404 error
                callback(null, {
                    statusCode: 404,
                    body: JSON.stringify({ error: npmError.message })
                });
            }
        } else {
            // Log the error and return a 500 error for any other S3 failure
            Logger.error(error, { topic: logTopic });
            callback(null, {
                statusCode: 500,
                body: JSON.stringify({ error: error.message })
            });
        }
    }
};