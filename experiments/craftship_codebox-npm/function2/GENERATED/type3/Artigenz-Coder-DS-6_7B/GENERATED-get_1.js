const AWS = require('aws-sdk');
const fetch = require('node-fetch');
const GitHub = require('@octokit/rest');
const urlParse = require('url');

module.exports.handler = async (event, context, callback) => {
    // Initialize AWS SDK clients
    const s3 = new AWS.S3();

    // Parse the path parameters
    const name = decodeURIComponent(event.pathParameters.name);

    try {
        // Attempt to get index.json from S3
        let result = await s3.getObject({ Bucket: process.env.BUCKET, Key: `${name}/index.json`}).promise();
        
        // If successful, parse the JSON and return the dist-tags
        let json = JSON.parse(result.Body.toString());
        callback(null, {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ok: true,
                id: name,
                'dist-tags': json['dist-tags']
            })
        });
    } catch (err) {
        // If S3 throws a NoSuchKey error, attempt to get the package info from npm registry
        if (err.code === 'NoSuchKey') {
            try {
                let res = await fetch(`${process.env.REGISTRY}/${name}`);
                let pkg = await res.json();
                
                callback(null, {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ok: true,
                        id: name,
                        'dist-tags': pkg['dist-tags']
                    })
                });
            } catch (err) {
                // Return 500 if unable to reach npm registry
                callback(null, {
                    statusCode: 500,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ok: false,
                        error: err.message
                    })
                });
            }
        } else {
            // Return 500 if another error occurred
            callback(null, {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ok: false,
                    error: err.message
                })
            });
        }
    }
};