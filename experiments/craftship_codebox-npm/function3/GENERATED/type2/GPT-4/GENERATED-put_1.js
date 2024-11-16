// Import required packages for Node.js
const S3 = require('../adapters/s3'); 
const Logger = require('../adapters/logger');

// AWS Lambda Handler Function
exports.handler = async function(event, context, callback) {
    // Initialize S3 and Logger instances
    const s3 = new S3({
        region: process.env.region,
        bucket: process.env.bucket
    });

    const logger = new Logger({
        logTopic: process.env.logTopic
    });

    // Extracts package `name` and `tag` from `pathParameters`
    const { name, tag } = event.pathParameters;
    const newVersion = JSON.parse(event.body).version;

    try {
        // Retrieves the existing `index.json` file for the given `name` from S3
        const indexJson = await s3.get(`${name}/index.json`);

        // Parses the JSON content
        const indexData = JSON.parse(indexJson);

        // Update the `dist-tags` with the provided `tag` and `version`
        indexData['dist-tags'][tag] = newVersion;

        // Save the modified `index.json` back to S3 bucket
        await s3.put(`${name}/index.json`, JSON.stringify(indexData));
        
        // Log the update operation
        logger.log({
            message: `Updated dist-tags for ${name}: ${tag} -> ${newVersion}`,
            level: 'info',
            package: name,
            request_id: event.requestContext.requestId,
            user: event.requestContext.user
        });

        // Returns a success response
        callback(null, {
            statusCode: 200,
            body: JSON.stringify({
                ok: true,
                id: name,
                'dist-tags': indexData['dist-tags']
            })
        });
    } catch (error) {
        // Log error
        logger.log({
            message: `Error updating dist-tags for ${name}: ${error.message}`,
            level: 'error',
            package: name,
            request_id: event.requestContext.requestId,
            user: event.requestContext.user
        });

        // Returns an error response
        callback(null, {
            statusCode: 500,
            body: JSON.stringify({
                ok: false,
                error: 'Failed to update distribution tag',
                details: error.message
            })
        });
    }
};