// Required dependencies
import NPM from '../adapters/npm';
import S3 from '../adapters/s3';
import Logger from '../adapters/logger';

/**
 * Retrieves the distribution tags (dist-tags) for a given npm package.
 * @param {Object} requestContext - Information about the request, including authorization details.
 * @param {Object} pathParameters - Path parameters extracted from the request URL.
 * @param {Object} context - AWS Lambda context object.
 * @param {Function} callback - Callback function to return the response.
 */
export default async ({ requestContext, pathParameters }, context, callback) => {
  const { registry, bucket, region, logTopic } = process.env;
  const user = {
    name: requestContext.authorizer.username,
    avatar: requestContext.authorizer.avatar,
  };
  const s3 = new S3({ region, bucket });
  const npmAdapter = new NPM();
  const log = new Logger('dist-tags:get', { region, topic: logTopic });

  const name = `${decodeURIComponent(pathParameters.name)}`;

  try {
    const pkgBuffer = await s3.get(`${name}/index.json`);
    const json = JSON.parse(pkgBuffer.toString());

    return callback(null, {
      statusCode: 200,
      body: JSON.stringify({
        distTags: json['dist-tags'],
      }),
    });
  } catch (s3Error) {
    if (s3Error.code === 'NoSuchKey') {
      try {
        const { distTags } = await npmAdapter.package(registry, name);

        return callback(null, {
          statusCode: 200,
          body: JSON.stringify({
            distTags,
          }),
        });
      } catch (npmError) {
        await log.error(user, npmError);

        return callback(null, {
          statusCode: 404,
          body: JSON.stringify({
            error: npmError.message,
          }),
        });
      }
    } else {
      await log.error(user, s3Error);

      return callback(null, {
        statusCode: 500,
        body: JSON.stringify({
          error: s3Error.message,
        }),
      });
    }
  }
};