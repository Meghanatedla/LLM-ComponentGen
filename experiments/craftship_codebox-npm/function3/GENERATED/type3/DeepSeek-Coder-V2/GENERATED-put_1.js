import S3 from '../adapters/s3';
import Logger from '../adapters/logger';

export default async ({
  requestContext,
  body,
  pathParameters,
}, context, callback) => {
  const { bucket, region, logTopic } = process.env;
  const user = {
    name: requestContext.authorizer.username,
    avatar: requestContext.authorizer.avatar,
  };
  const storage = new S3({ region, bucket });
  const log = new Logger('dist-tags:update', { region, topic: logTopic });

  const { name, tag } = pathParameters;
  const { version } = JSON.parse(body);

  try {
    // Fetch the existing index.json file from S3
    const pkgBuffer = await storage.get(`${name}/index.json`);
    const json = JSON.parse(pkgBuffer.toString());

    // Update the dist-tags with the new version
    json['dist-tags'][tag] = version;

    // Save the updated index.json back to S3
    await storage.put(`${name}/index.json`, JSON.stringify(json));

    // Log the update operation
    await log.info(user, {
      message: 'Updated dist-tag',
      package: name,
      tag,
      version,
    });

    // Return a success response
    return callback(null, {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        id: name,
        'dist-tags': json['dist-tags'],
      }),
    });
  } catch (error) {
    // Log the error and return a failure response
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