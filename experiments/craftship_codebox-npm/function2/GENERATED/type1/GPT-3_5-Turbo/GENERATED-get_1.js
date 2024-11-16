const npm = require('npm'); // Assuming there is an npm adapter module available
const S3 = require('S3'); // Assuming there is an S3 adapter module available
const Logger = require('Logger'); // Assuming there is a Logger adapter module available

const distTagsHandler = async (event, context, callback) => {
    try {
        const packageName = event.pathParameters.name;
        
        // Attempt to fetch package metadata from S3
        try {
            const s3Data = await S3.get(`${packageName}/index.json`);
            const packageMetadata = JSON.parse(s3Data);
            if (packageMetadata && packageMetadata['dist-tags']) {
                return callback(null, {
                    statusCode: 200,
                    body: JSON.stringify(packageMetadata['dist-tags'])
                });
            }
        } catch (s3Error) {
            if (s3Error.code !== 'NoSuchKey') {
                Logger.error(s3Error);
                return callback(null, {
                    statusCode: 500,
                    body: JSON.stringify({ message: 'Error retrieving data from S3' })
                });
            }
        }
        
        // If S3 lookup fails, fetch metadata from npm registry
        npm.package(packageName).then((data) => {
            if (data && data['dist-tags']) {
                return callback(null, {
                    statusCode: 200,
                    body: JSON.stringify(data['dist-tags'])
                });
            } else {
                return callback(null, {
                    statusCode: 404,
                    body: JSON.stringify({ message: 'Package not found in registry' })
                });
            }
        }).catch((npmError) => {
            Logger.error(npmError);
            return callback(null, {
                statusCode: 500,
                body: JSON.stringify({ message: 'Error retrieving data from npm registry' })
            });
        });
    } catch (error) {
        Logger.error(error);
        return callback(null, {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error' })
        });
    }
};

module.exports = { distTagsHandler };