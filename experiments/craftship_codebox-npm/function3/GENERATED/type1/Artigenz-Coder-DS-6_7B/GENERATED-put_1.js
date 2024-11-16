const s3 = new (require('./adapters/s3'))(); // Initialize S3 adapter
const logger = new (require('./adapters/logger'))(process.env.logTopic); // Initialize Logger adapter

exports.handler = async (event, context, callback) => {
    
    let params = {
        Bucket: process.env.bucket,
        Key: '{packageName}/index.json'.replace('{packageName}', event.pathParameters.name)
    };
    
    try {
        
        const indexData = await s3.getObject(params).promise(); // Retrieve the index.json file
        let jsonContent = JSON.parse(indexData.Body.toString()); // Parse the JSON content

        // Update the dist-tag with the provided version
        jsonContent['dist-tags'][event.pathParameters.tag] = event.body;
        
        await s3.putObject({...params, Body: JSON.stringify(jsonContent)}).promise(); // Save the modified index.json back to S3
        
        // Log the update operation
        logger.info("Updated dist-tag", {
            packageId: event.pathParameters.name,
            distTag: event.pathParameters.tag,
            version: event.body
        });

        // Return a success response
        callback(null, {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ok: true,
                id: event.pathParameters.name,
                'dist-tags': jsonContent['dist-tags'],
            })
        });
        
    } catch (err) {
        
        // Log the error
        logger.error("Failed to update dist-tag", err);

        // Return an error response
        callback(null, {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ok: false,
                error: err.message || 'An error occurred while processing your request.'
            })
        });
    }
};