// Require dependencies
const npm = require('./adapters/npm'); // Assuming this exists and works correctly
const s3 = require('./adapters/s3'); // Assuming this exists and works correctly
const Logger = require('./adapters/logger'); // Assuming this exists and works correctly

exports.handler = async (event, context, callback) => {
    const requestContext = event.requestContext || {};
    const pathParameters = event.pathParameters || {};
    const { name } = pathParameters;

    try {
        let indexJsonBuffer;
        
        // Try to get index.json from S3
        try {
            indexJsonBuffer = await s3.get(`${name}/index.json`);
        } catch (err) {
            // Ignore NoSuchKey errors
            if (err.code!== 'NoSuchKey') throw err;
        }

        // If we got something from S3, parse it and return the dist-tags
        if (indexJsonBuffer) {
            const indexJsonString = indexJsonBuffer.toString();
            const indexJson = JSON.parse(indexJsonString);
            
            return callback(null, {
                statusCode: 200,
                body: JSON.stringify(indexJson.distTags),
            });
        }

        // Fall back to getting the package from the npm registry
        const pkgInfo = await npm.package(process.env.registry, name);

        // Return the dist-tags
        return callback(null, {
            statusCode: 200,
            body: JSON.stringify(pkgInfo.distTags),
        });
    } catch (err) {
        console.error(err);
        const logger = new Logger(event, process.env.logTopic, process.env.clientId, process.env.secret);
        logger.error(requestContext.authorizer && requestContext.authorizer.username, { stack: err.stack, message: err.message });

        return callback(null, {
            statusCode: 500,
            body: JSON.stringify({ error: 'An internal server error occurred.' }),
        });
    }
};