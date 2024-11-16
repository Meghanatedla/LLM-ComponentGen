'use strict';

const S3 = require('s3');   // S3 Adapter module
const npm = require('npm'); // npm Adapter module
const Logger = require('logger'); // Logger module
const AWS = require('aws-sdk');

const s3 = new AWS.S3();

// The environment variables required for the function
const registry = process.env.CODEBOX_REGISTRY;
const bucket = process.env.CODEBOX_BUCKET;
const region = process.env.CODEBOX_REGION;
const logTopic = process.env.CODEBOX_LOGTOPIC;

/**
 * This function retrieves the distribution tags for a given npm package,
 * first attempting to fetch the package information from an S3 bucket and if that fails, 
 * then from npm registry.
 */
module.exports.getDistTags = async function(requestContext, pathParameters, context, callback) {
    // Package name from the request
    const packageName = pathParameters.name;

    const key = `${packageName}/index.json`;

    try {
        // Try fetching the package from S3
        const data = await s3.getObject({ Bucket: bucket, Key: key }).promise();

        // If the data fetch is successful, then parse the JSON and return dist-tags property to the callback
        const jsonData = JSON.parse(data.Body.toString('utf-8'))
        return callback(null, { statusCode: 200, body: JSON.stringify(jsonData['dist-tags']) });
    } catch (error) {
        if (error.code === 'NoSuchKey') {
            // The given key was not found in the bucket. Proceed with fetching the data from npm registry.
            try {
                const npmData = await npm.package(packageName, registry);  // Fetch the data from npm registry.
                return callback(null, { statusCode: 200, body: JSON.stringify(npmData['dist-tags']) });
            } catch (npmError) {
                // Log the npm error and send a 404 status code.
                Logger.error('Failed to fetch from npm registry', { packageName, error: npmError.message });
                return callback(null, { statusCode: 404, body: JSON.stringify({ error: npmError.message }) });
            }
        } else {
            // Log the unexpected S3 error and send a 500 status code.
            Logger.error('Unexpected S3 error occured', { packageName, error: error.message });
            return callback(null, { statusCode: 500, body: JSON.stringify({ error: error.message }) });
        }
    }
}