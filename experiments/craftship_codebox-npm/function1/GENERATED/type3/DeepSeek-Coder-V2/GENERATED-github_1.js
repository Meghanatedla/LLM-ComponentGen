// src/authorizer/github.js

import { Octokit } from '@octokit/rest';
import url from 'url';

const generatePolicy = (principalId, effect, resource, context) => {
  const policy = {
    principalId,
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
  return policy;
};

export default async ({ methodArn, authorizationToken }, context, callback) => {
  const { githubUrl, githubClientId, githubSecret, restrictedOrgs, admins } = process.env;

  // Extract the token from the authorization header
  const tokenMatch = authorizationToken.match(/^Bearer (.+)$/);
  if (!tokenMatch) {
    return callback('Unauthorized');
  }
  const githubToken = tokenMatch[1];

  // Initialize Octokit with GitHub credentials
  const octokit = new Octokit({
    auth: {
      username: githubClientId,
      password: githubSecret,
    },
    baseUrl: githubUrl,
  });

  try {
    // Validate the token with GitHub
    const { data: user } = await octokit.users.getAuthenticated({
      headers: {
        Authorization: `token ${githubToken}`,
      },
    });

    const username = user.login;
    const avatarUrl = user.avatar_url;
    const userId = user.id;

    // Check if the user is in the admin list
    const isAdmin = admins ? admins.split(',').includes(username) : false;

    // Check if the user is in any of the restricted organizations
    let isMemberOfRestrictedOrg = false;
    if (restrictedOrgs) {
      const orgs = await octokit.orgs.listForAuthenticatedUser({
        headers: {
          Authorization: `token ${githubToken}`,
        },
      });
      const orgNames = orgs.data.map(org => org.login);
      isMemberOfRestrictedOrg = orgNames.some(org => restrictedOrgs.split(',').includes(org));
    }

    // Determine the effect based on the user's permissions
    const effect = 'Allow';
    const resource = methodArn.split('/').slice(0, -1).join('/') + '/*';

    // Generate the IAM policy
    const policy = generatePolicy(userId, effect, resource, {
      username,
      avatarUrl,
      isAdmin,
      isMemberOfRestrictedOrg,
      timestamp: new Date().toISOString(),
    });

    return callback(null, policy);
  } catch (error) {
    console.error('Authorization failed:', error);
    return callback('Unauthorized');
  }
};