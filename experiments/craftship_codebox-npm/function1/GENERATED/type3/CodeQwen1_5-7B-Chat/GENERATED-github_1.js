// Dependencies
const axios = require('axios');
const Logger = require('./adapters/logger');

// Helper function to generate IAM policy
const generatePolicy = (effect, resource, context) => {
  return {
    principalId: 'user',
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context,
  };
};

// Main function
exports.handler = async ({ methodArn, authorizationToken }, context, callback) => {
  const logger = new Logger('github_authorizer', {});
  const githubToken = authorizationToken.split(' ')[1];
  if (!githubToken) {
    logger.error({}, 'Missing authorization token', { method: methodArn });
    return callback('Unauthorized', {
      statusCode: 403,
      body: JSON.stringify({ message: 'Missing or invalid authorization token' }),
    });
  }

  const githubConfig = {
    headers: {
      Authorization: `token ${githubToken}`,
    },
  };

  try {
    const userResponse = await axios.get('https://api.github.com/user', githubConfig);
    const user = userResponse.data;

    const isRestrictedOrgMember = process.env.restrictedOrgs
      ? await Promise.all(
          process.env.restrictedOrgs
            .split(',')
            .map(org =>
              axios.get(`https://api.github.com/user/memberships/orgs/${org}`, githubConfig)
                .then(() => true)
                .catch(() => false)
            )
        )
        .then(memberships => memberships.includes(true))
      : false;

    const isAdmin = process.env.admins ? process.env.admins.split(',').includes(user.login) : false;

    if (!isRestrictedOrgMember && !isAdmin) {
      logger.error(user, 'Unauthorized access attempt', { method: methodArn });
      return callback('Unauthorized', {
        statusCode: 403,
        body: JSON.stringify({ message: 'Access Denied' }),
      });
    }

    const effect = isAdmin || isRestrictedOrgMember ? 'Allow' : 'Deny';
    const effectPolicy = generatePolicy(effect, methodArn, {
      username: user.login,
      avatar_url: user.avatar_url,
      requestTime: new Date().toISOString(),
      methodArn,
    });

    logger.info(user, `User ${user.login} successfully authenticated`, effectPolicy);
    return callback(null, effectPolicy);
  } catch (error) {
    logger.error(user || {}, error.message, { method: methodArn });
    return callback('Unauthorized', {
      statusCode: 403,
      body: JSON.stringify({ message: 'Authentication failed' }),
    });
  }
};