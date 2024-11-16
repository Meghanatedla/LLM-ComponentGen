const AWS = require('aws-sdk');
AWS.config.update({ region: process.env.REGION }); // Set the appropriate region where the S3 Bucket is located

exports.handler = async (event, context, callback) => {
    const s3 = new AWS.S3();
    
    try {
        const params = {
            Bucket: process.env.BUCKET, // Your S3 Bucket Name
            Key: `${event.pathParameters.name}/index.json` // Assuming 'name' is the package name
        };
        
        let data = await s3.getObject(params).promise();
        let jsonData = JSON.parse(data.Body);

        // Update dist-tags
        jsonData.distTags[event.pathParameters.tag] = event.body.version;

        // Save the updated data back to S3
        await s3.putObject({
           ...params,
            Body: JSON.stringify(jsonData),
            ContentType: "application/json"
        }).promise();
        
        console.log("Distribution Tag updated successfully");
        callback(null, { statusCode: 200, body: JSON.stringify({ ok: true, id: event.pathParameters.name, distTags: jsonData.distTags }) });
    } catch (err) {
        console.error(err);
        callback(null, { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) });
    }
};