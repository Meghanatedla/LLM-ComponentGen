import npm from '../adapters/npm';
import S3 from '../adapters/s3';
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
  const storage = new S3({ region, bucket });
  const log = new Logger('dist-tags:get', { region, topic: logTopic });

  const name = `${decodeURIComponent(pathParameters.name)}`;

  try {
    const pkgBuffer = await storage.get(`${name}/index.json`);
    const json = JSON.parse(pkgBuffer.toString());

    return callback(null, {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        distTags: json['dist-tags'],
      }),
    });
  } catch (storageError) {
    // S3 lookup failed, try to fetch from npm registry
    try {
      const pkg = await npm.package(registry, name);
      return callback(null, {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          distTags: pkg['dist-tags'],
        }),
      });
    } catch (npmError) {
      await log.error(user, {
        message: `Failed to fetch dist-tags for ${name}: ${storageError.message || npmError.message}`,
        stack: storageError.stack || npmError.stack,
      });

      return callback(null, {
        statusCode: 500,
        body: JSON.stringify({
          ok: false,
          error: `Failed to fetch dist-tags for ${name}`,
        }),
      });
    }
  }
};
