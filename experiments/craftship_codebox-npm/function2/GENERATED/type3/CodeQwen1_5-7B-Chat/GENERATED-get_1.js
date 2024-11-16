import npm from '../adapters/npm';
import Logger from '../adapters/logger';

export default async ({
  requestContext,
  pathParameters,
}, context, callback) => {
  const { registry, bucket, region, logTopic } = process.env;
  const user = {
    name: requestContext.authorizer.username,
    avatar: requestContext.authorizer.avatar,
  };
  const log = new Logger('dist-tags:get', { region, topic: logTopic });

  const name = `${decodeURIComponent(pathParameters.name)}`;

  try {
    // Attempt to retrieve package data from S3
    const s3 = new S3({ region, bucket });
    const s3Buffer = await s3.get(`${name}/index.json`);

    // If S3 retrieval is successful, parse the JSON and return dist-tags
    const s3Json = JSON.parse(s3Buffer.toString());
    return callback(null, {
      statusCode: 200,
      body: JSON.stringify({
        distTags: s3Json['dist-tags'],
      }),
    });
  } catch (s3Error) {
    // If S3 retrieval fails, fetch data from npm registry
    try {
      const pkgData = await npm.package(registry, name);
      const distTags = pkgData['dist-tags'];

      // Log success and return dist-tags
      await log.info(user, {
        name,
        distTags,
      });

      return callback(null, {
        statusCode: 200,
        body: JSON.stringify({
          distTags,
        }),
      });
    } catch (npmError) {
      // Log error and return 404 if package is not found
      if (npmError.status === 404) {
        await log.error(user, npmError.message);
        return callback(null, {
          statusCode: 404,
          body: JSON.stringify({
            error: 'Package not found.',
          }),
        });
      }

      // Log generic error and return 500
      await log.error(user, npmError.message);
      return callback(null, {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Failed to retrieve dist-tags.',
        }),
      });
    }
  }
};