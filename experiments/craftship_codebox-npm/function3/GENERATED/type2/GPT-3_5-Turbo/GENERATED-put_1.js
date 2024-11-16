// Import necessary modules
const S3 = require('../adapters/s3');
const Logger = require('../adapters/logger');

// Define the function for updating distribution tags
const updateDistTags = (event, context, callback) => {
  // Initialize S3 and Logger instances based on environment variables
  const s3 = new S3(process.env.bucket, process.env.region);
  const logger = new Logger(process.env.logTopic);

  // Extract required parameters from the event object
  const { requestContext, body, pathParameters } = event;

  // Extract package name and target dist-tag from path parameters
  const { name, tag } = pathParameters;

  try {
    // Fetch the index.json file for the package from the S3 bucket
    const indexData = s3.getFile(`${name}/index.json`);
    const index = JSON.parse(indexData);

    // Update the dist-tags entry with the provided tag and version
    index['dist-tags'][tag] = body.version;

    // Save the modified index.json back to the S3 bucket
    s3.saveFile(`${name}/index.json`, JSON.stringify(index));

    // Log the update operation
    logger.info(`Updated dist-tags for package ${name}: ${tag} -> ${body.version}`);

    // Return a success response via the callback
    callback(null, {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        id: name,
        'dist-tags': index['dist-tags']
      })
    });
  } catch (error) {
    // Log the error and return a failure response via the callback
    logger.error(`Error updating dist-tags for package ${name}: ${error.message}`);
    callback(null, {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: error.message
      })
    });
  }
};

// Export the function for use in the Lambda environment
module.exports = updateDistTags;