// Importing required AWS SDK
const AWS = require('aws-sdk');

// Instantiate instances of required adapters
const S3 = new AWS.S3({ region: process.env.region });
const Npm = require('../adapters/npm.js');
const Logger = require('../adapters/logger.js');

// Create a client using the imported npm adapter
const npmClient = new Npm();

// Create a logger using the imported logger adapter
const logger = new Logger({ cmd: 'dist-tags.get', namespace: 'dist-tags' });

// This function retrieves the distribution tags for a given npm package from 
// either an S3 bucket or the npm registry when S3 bucket retrieval fails.
const getDistTags = async (requestContext, pathParameters, context, callback) => {
  // Extracting the package name from path parameters
  const pkgName = pathParameters.name;
  
  try {
    // Trying first to get the package data from S3
    const s3Data = await S3.get(`${pkgName}/index.json`);
    
    // Parsing the retrieved data from S3
    const parsedS3Data = JSON.parse(s3Data.toString());
    
    // Returning the dist-tags in the callback with a status code of 200
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(parsedS3Data['dist-tags']),
    });
  } catch (s3Error) {
    // if we encounter a NoSuchKey error, the package name provided is not found in the S3 bucket
    // We try to fetch the package data from the npm registry
    if (s3Error.code === 'NoSuchKey') {
      try {
        // Trying to get the public package data from npm registry
        const npmData = await npmClient.package(pkgName);
        
        // Returning the dist-tags in the callback with a status code of 200
        callback(null, {
          statusCode: 200,
          body: JSON.stringify(npmData['dist-tags']),
        });
      } catch (npmError) {
        // We log the failure to retrieve data from npm registry
        logger.error(requestContext.authorizer.username, { stack: npmError.stack, message: npmError.message });
        
        // Send the error through the callback
        callback(null, {
          statusCode: 404,
          body: JSON.stringify({ error: 'Package not found' }),
        });
      }
    } else {
      // We log any unexpected error that occurs during S3 interaction
      logger.error(requestContext.authorizer.username, { stack: s3Error.stack, message: s3Error.message });
      
      // Send the error through the callback 
      callback(null, {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server error' }),
      });
    }
  }
};

module.exports = getDistTags;