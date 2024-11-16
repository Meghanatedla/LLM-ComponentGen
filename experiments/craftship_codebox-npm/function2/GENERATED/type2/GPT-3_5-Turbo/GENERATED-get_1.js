// Assuming this function will be placed in a new file called `dist-tags/get.js` within the `/src` directory

// Import necessary adapters
const S3 = require('./adapters/s3');
const npm = require('./adapters/npm');
const Logger = require('./adapters/logger');

// Define the dist-tags retrieval function
const getDistTags = async (event, context, callback) => {
  // Destructure necessary parameters from event
  const { requestContext, pathParameters } = event;

  try {
    // Initialize S3 adapter with region and bucket environment variables
    const s3 = new S3({ region: process.env.region, bucket: process.env.bucket });

    // Construct key for S3 lookup
    const s3Key = `${pathParameters.name}/index.json`;

    // Attempt to retrieve package metadata from S3
    let s3Data;
    try {
      s3Data = await s3.get(s3Key);
    } catch (error) {
      // Handle S3 errors
      if (error.code === 'NoSuchKey') {
        // Fetch package metadata from the npm registry if key doesn't exist in S3
        try {
          const npmData = await npm.package(process.env.registry, pathParameters.name);
          callback(null, {
            statusCode: 200,
            body: JSON.stringify(npmData.distTags)
          });
        } catch (npmError) {
          // Handle npm registry fetch errors
          Logger.error(requestContext.authorizer.username, { stack: npmError.stack, message: npmError.message });
          callback(null, {
            statusCode: 404,
            body: JSON.stringify({ error: `Package ${pathParameters.name} not found in the npm registry` })
          });
        }
      } else {
        // Log and return 500 error for other S3 fetch errors
        Logger.error(requestContext.authorizer.username, { stack: error.stack, message: error.message });
        callback(null, {
          statusCode: 500,
          body: JSON.stringify({ error: 'Internal server error' })
        });
      }
    }

    // Parse the JSON data from S3 and return dist-tags
    const s3ParsedData = JSON.parse(s3Data);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(s3ParsedData.distTags)
    });

  } catch (error) {
    // Catch any unexpected errors
    Logger.error(requestContext.authorizer.username, { stack: error.stack, message: error.message });
    callback(null, {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    });
  }
};

// Export the function
module.exports = { getDistTags };
