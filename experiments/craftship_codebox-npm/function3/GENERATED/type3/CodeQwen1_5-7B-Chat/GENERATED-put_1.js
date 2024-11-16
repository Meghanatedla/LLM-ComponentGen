// Import necessary modules
import S3 from '../adapters/s3';
import Logger from '../adapters/logger';

// Function to update distribution tag
export default async ({
  requestContext,
  body,
  pathParameters,
}, context, callback) => {
  // Extract package name and tag from path parameters
  const { registry, bucket, region, logTopic } = process.env;
  const user = {
    name: requestContext.authorizer.username,
    avatar: requestContext.authorizer.avatar,
  };
  const storage = new S3({ region, bucket });
  const log = new Logger('update-dist-tag', { region, topic: logTopic });

  const { name, tag } = pathParameters;

  try {
    // Fetch existing index.json from S3
    const pkgBuffer = await storage.get(`${name}/index.json`);

    // Parse the JSON content
    const json = JSON.parse(pkgBuffer.toString());

    // Update the dist-tags entry with the new version
    json['dist-tags'][tag] = body.version;

    // Save the modified index.json to S3
    await storage.put(`${name}/index.json`, JSON.stringify(json));

    // Log the update and return a success response
    log.info(user, `Updated ${tag} dist-tag for ${name} to version ${body.version}`);
    return callback(null, {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        id: name,
        'dist-tags': json['dist-tags'],
      }),
    });
  } catch (error) {
    // Log error and return a failure response
    await log.error(user, error);
    return callback(null, {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: error.message,
      }),
    });
  }
};