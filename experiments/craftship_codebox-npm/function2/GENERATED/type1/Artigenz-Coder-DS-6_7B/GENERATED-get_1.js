const npm = require('./adapters/npm');
const s3 = require('./adapters/s3');
const logger = require('./adapters/logger');

exports.handler = async (event, context, callback) => {
    const packageName = event.pathParameters.name;
    let body;
    let statusCode = 200;
  
    try {
        // Attempt to fetch from S3
        const s3Response = await s3.get(`${packageName}/index.json`);
        
        // If S3 fetch was successful
        if (s3Response.Body) {
            const jsonData = Buffer.from(s3Response.Body).toString();
            body = JSON.parse(jsonData).distTags;
            
        } else {
            // If S3 fetch failed due to NoSuchKey error, fallback to npm registry
            const npmResponse = await npm.package(packageName);
            body = npmResponse.distTags;
      
        }
     
    } catch (err) {
        switch (err.code) {
            case 'NoSuchKey':
                statusCode = 404;
                body = {
                    errorMessage: 'Package not found.'
                };
                break;
                
            default:
                statusCode = 500;
                body = {
                    errorMessage: err.message
                };
                // Log the error
                logger.error({
                    message: 'Error fetching package',
                    error: err,
                    requestId: context.awsRequestId
                });
                break;
        }
    }

    callback(null, {
        statusCode: statusCode,
        headers: {
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify(body),
    });
};