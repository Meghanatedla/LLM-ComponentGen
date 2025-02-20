import S3 from '../adapters/s3';
import NPM from '../adapters/npm';
import Logger from '../adapters/logger';

export default async ({ requestContext, pathParameters }, context, callback) => {
  const { bucket, region, registry, logTopic } = process.env;
  const user = {
    name: requestContext.authorizer.username,
    avatar: requestContext.authorizer.avatar,
  };
  const storage = new S3({ region, bucket });
  const npm = new NPM(registry);
  const log = new Logger('dist-tags:get', { region, topic: logTopic });

  const name = `${decodeURIComponent(pathParameters.name)}`;

  try {
    const pkgBuffer = await storage.get(`${name}/index.json`);
    const json = JSON.parse(pkgBuffer.toString());

    return callback(null, {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        id: json.name,
        'dist-tags': json['dist-tags'],
      }),
    });
  } catch (storageError) {
    if (storageError.code === 'NoSuchKey') {
      try {
        const pkgJson = await npm.package(name);

        return callback(null, {
          statusCode: 200,
          body: JSON.stringify({
            ok: true,
            id: pkgJson.name,
            'dist-tags': pkgJson['dist-tags'],
          }),
        });
      } catch (npmError) {
        await log.error(user, npmError);

        return callback(null, {
          statusCode: 404,
          body: JSON.stringify({
            ok: false,
            error: npmError.message,
          }),
        });
      }
    } else {
      await log.error(user, storageError);

      return callback(null, {
        statusCode: 500,
        body: JSON.stringify({
          ok: false,
          error: storageError.message,
        }),
      });
    }
  }
};