import S3 from '../adapters/s3';
import Logger from '../adapters/logger';

export default async ({ requestContext, body, pathParameters }, context, callback) => {
  const { bucket, region, logTopic } = process.env;
  const { name, tag } = pathParameters;
  const user = {
    name: requestContext.authorizer.username,
    avatar: requestContext.authorizer.avatar,
  };
  const storage = new S3({ region, bucket });
  const log = new Logger('dist-tags:update', { region, topic: logTopic });

  try {
    const pkgBuffer = await storage.get(`${name}/index.json`);
    const pkgJson = JSON.parse(pkgBuffer.toString());

    pkgJson['dist-tags'][tag] = body.version;

    await storage.put(`${name}/index.json`, JSON.stringify(pkgJson));

    await log.info(user, `Updated dist-tag '${tag}' for package '${name}' to version ${body.version}`);

    return callback(null, {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        id: pkgJson._id, // Assuming package ID is stored in the metadata
        dist-tags: pkgJson['dist-tags'],
      }),
    });
  } catch (error) {
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