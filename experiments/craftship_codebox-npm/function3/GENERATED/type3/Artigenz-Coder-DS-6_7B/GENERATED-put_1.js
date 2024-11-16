// Required dependencies
import AWS from 'aws-sdk';
import Logger from './adapters/logger';

exports.handler = async (event, context, callback) => {
   // Initialize AWS S3 and Logger
   const s3 = new AWS.S3();
   const logger = new Logger();

   // Get the necessary details from the event
   const { requestContext, body, pathParameters } = event;
   const { bucket, region, logTopic } = process.env;
   const user = {
       name: requestContext.authorizer.username,
       avatar: requestContext.authorizer.avatar,
   };
   const name = `${decodeURIComponent(pathParameters.name)}`;
   const tag = `${decodeURIComponent(pathParameters.tag)}`;
   const version = JSON.parse(body).version;

   try {
       // Fetch the existing index.json file
       const params = { Bucket: bucket, Key: `${name}/index.json` };
       const result = await s3.getObject(params).promise();
       const json = JSON.parse(result.Body.toString());

       // Update the dist-tags
       json['dist-tags'][tag] = version;

       // Save the updated index.json back to S3
       const putParams = {
           Bucket: bucket,
           Key: `${name}/index.json`,
           Body: JSON.stringify(json),
       };
       await s3.putObject(putParams).promise();

       // Log the update
       await logger.info(user, `Updated ${name}@${tag} to ${version}`);

       // Return a success response
       return callback(null, {
           statusCode: 200,
           body: JSON.stringify({
               ok: true,
               id: name,
               distTags: json['dist-tags'],
           }),
       });
   } catch (err) {
       // Log the error
       await logger.error(user, err);

       // Return an error response
       return callback(null, {
           statusCode: 500,
           body: JSON.stringify({
               ok: false,
               error: err.message,
           }),
       });
   }
};