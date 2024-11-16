// import required adapters
import S3 from '../adapters/s3';
import Logger from '../adapters/logger';

export default async ({
  requestContext,
  pathParameters,
  body,
}, context, callback) => {
  // retrieve environment variables
  const { bucket, region, logTopic } = process.env;

  // store user context informations
  const user = {
    name: requestContext.authorizer.username,
    avatar: requestContext.authorizer.avatar,
  };

  // instantiate logger and storage instances
  const log = new Logger('dist-tags:put', { region, topic: logTopic });
  const storage = new S3({ region, bucket });

  // Extract package name and dist tag from path parameters
  const name = decodeURIComponent(pathParameters.name);
  const tag = decodeURIComponent(pathParameters.tag);

  // Extract version from request body
  const { version } = JSON.parse(body);

  // Construct S3 key for index.json
  const key = `${name}/index.json`;

  try {
    // Fetch index.json from S3
    const pkgBuffer = await storage.get(key);

    // Parse JSON content
    let json = JSON.parse(pkgBuffer.toString());

    // Update the dist-tags entry with the new version
    json['dist-tags'][tag] = version;

    // Convert data back into a Buffer
    const data = Buffer.from(JSON.stringify(json));

    // write the updated index.json file back to the S3 bucket
    await storage.write(key, data);

    // log the update operation
    await log.info(user, `Updated dist-tag: ${tag} to version: ${version} for package: ${name}`);

    // return success response
    return callback(null, {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        id: name,
        'dist-tags': json['dist-tags'],
      }),
    });
    
  } catch (error) {
    // log any error that occurred during this process
    await log.error(user, error);
    
    // return error response
    return callback(null, {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: error.message,
      }),
    });
  }
};