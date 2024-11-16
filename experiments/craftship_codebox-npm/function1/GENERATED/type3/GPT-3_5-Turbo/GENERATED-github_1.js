import { Octokit } from '@octokit/rest';
import url from 'url';

const generatePolicy = (userId, effect, resource) => {
  const policy = {
    principalId: userId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: resource,
      }],
    },
    context: {
      user_id: userId,
      user_name: 'John Doe', // Placeholder, actual name fetched from GitHub
      avatar_url: 'https://example.com/avatar.jpg', // Placeholder, actual avatar URL fetched from GitHub
      timestamp: new Date().toISOString(),
    },
  };
  return policy;
};

export default async ({ methodArn, authorizationToken }, context, callback) => {
  // Environmental variables
  const { githubUrl, githubClientId, githubSecret, restrictedOrgs, admins } = process.env;

  // Extract access token
  const tokenParts = authorizationToken.split(' ');
  const token = tokenParts.length === 2 ? tokenParts[1] : null;

  if (!token) {
    return callback(null, generatePolicy('user', 'Deny', methodArn));
  }

  // Authenticate with GitHub
  const octokit = new Octokit({
    auth: {
      username: githubClientId,
      password: githubSecret,
    },
  });

  // Validate user token
  let user;
  try {
    user = await octokit.auth('token', token).users.getAuthenticated();
  } catch (error) {
    return callback(null, generatePolicy('user', 'Deny', methodArn));
  }

  const userId = user.data.id;
  const userLogin = user.data.login;

  // Check organization membership if restrictedOrgs exists
  let orgAccess = false;
  if (restrictedOrgs) {
    const orgs = await octokit.auth('token', token).orgs.listForUser({ username: userLogin });
    const userOrgs = orgs.data.map(org => org.login);
    orgAccess = userOrgs.some(org => restrictedOrgs.includes(org));
  }

  // Check admin status
  const isAdmin = admins && admins.split(',').includes(userLogin);

  // Generate policy based on access
  if (!orgAccess && !isAdmin) {
    return callback(null, generatePolicy(userId, 'Deny', methodArn));
  }

  const effect = 'Allow'; // Default allow
  const resource = methodArn;
  const policy = generatePolicy(userId, effect, resource);

  return callback(null, policy);
};