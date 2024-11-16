// src/dist-tags/get.js

import { S3 } from '../adapters/s3';
import { npm } from '../adapters/npm';
import { Logger } from '../adapters/logger';

// Assuming the contextFactory is available to create the context object
import { contextFactory } from '../contextFactory';

// Function to retrieve dist-tags for a given npm package
export const getDistTags = async (event, context, callback) => {
    // Create the context object using the contextFactory
    const ctx = contextFactory(event, context);

    // Extract necessary parameters from the event
    const { requestContext, pathParameters } = event;
    const { name: packageName } = pathParameters;

    // Initialize adapters
    const s3 = new S3({ region: ctx.region, bucket: ctx.bucket });
    const logger = new Logger('getDistTags', 'dist-tags', { clientId: ctx.logClientId, secret: ctx.logSecret });

    // Construct the S3 key for the package metadata
    const s3Key = `${packageName}/index.json`;

    try {
        // Attempt to retrieve the package metadata from S3
        const s3Response = await s3.get(s3Key);

        // Parse the JSON response from S3
        const packageMetadata = JSON.parse(s3Response.Body.toString());

        // Return the dist-tags from the package metadata
        callback(null, {
            statusCode: 200,
            body: JSON.stringify(packageMetadata.dist-tags)
        });
    } catch (error) {
        // Handle specific S3 error (NoSuchKey)
        if (error.code === 'NoSuchKey') {
            try {
                // Fallback to fetching the package metadata from the npm registry
                const npmResponse = await npm.package(ctx.registry, packageName);

                // Return the dist-tags from the npm registry response
                callback(null, {
                    statusCode: 200,
                    body: JSON.stringify(npmResponse['dist-tags'])
                });
            } catch (npmError) {
                // Log the npm registry error and return a 404 error
                logger.error(requestContext.authorizer.username, { stack: npmError.stack, message: npmError.message });
                callback(null, {
                    statusCode: 404,
                    body: JSON.stringify({ error: npmError.message })
                });
            }
        } else {
            // Log any other S3 errors and return a 500 error
            logger.error(requestContext.authorizer.username, { stack: error.stack, message: error.message });
            callback(null, {
                statusCode: 500,
                body: JSON.stringify({ error: error.message })
            });
        }
    }
};