// src/dist-tags/put.js

const AWS = require('aws-sdk');
const { S3 } = require('../adapters/s3');
const { Logger } = require('../adapters/logger');

exports.handler = async (event, context, callback) => {
    // Initialize S3 and Logger instances
    const s3 = new S3({
        bucket: process.env.bucket,
        region: process.env.region
    });

    const logger = new Logger({
        logTopic: process.env.logTopic,
        requestContext: event.requestContext
    });

    // Extract parameters from the event
    const { name, tag } = event.pathParameters;
    const { version } = JSON.parse(event.body);

    try {
        // Fetch the existing index.json file from S3
        const indexJson = await s3.getObject(`${name}/index.json`);
        const packageMetadata = JSON.parse(indexJson.Body.toString('utf-8'));

        // Update the dist-tags entry
        if (!packageMetadata['dist-tags']) {
            packageMetadata['dist-tags'] = {};
        }
        packageMetadata['dist-tags'][tag] = version;

        // Save the modified index.json back to S3
        await s3.putObject(`${name}/index.json`, JSON.stringify(packageMetadata));

        // Log the update operation
        logger.info(`Updated dist-tag '${tag}' to version '${version}' for package '${name}'`);

        // Return a success response
        callback(null, {
            statusCode: 200,
            body: JSON.stringify({
                ok: true,
                id: name,
                'dist-tags': packageMetadata['dist-tags']
            })
        });
    } catch (error) {
        // Log the error and return a failure response
        logger.error(`Failed to update dist-tag for package '${name}': ${error.message}`);
        callback(null, {
            statusCode: 500,
            body: JSON.stringify({
                ok: false,
                error: error.message
            })
        });
    }
};