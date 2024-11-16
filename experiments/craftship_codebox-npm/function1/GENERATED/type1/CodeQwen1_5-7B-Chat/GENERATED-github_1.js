const { Octokit } = require('@octokit/rest');
const url = require('url');

exports.handler = async (event, context, callback) => {
  const methodArn = event.methodArn;
  const authorizationToken = event.authorizationToken;

  // Extract and validate the GitHub access token from the authorizationToken header
  const [authType, authToken] = authorizationToken.split(' ');
  if (authType !== 'Bearer') {
    const policy = generateDenyPolicy(methodArn);
    callback(null, policy);
    return;
  }

  // Set up the GitHub API client with the provided client ID and secret
  const github = new Octokit({
    auth: `${process.env.GITHUB_CLIENT_ID}:${process.env.GITHUB_SECRET}`,
  });

  try {
    // Authenticate with GitHub using the provided access token
    const { data: userInfo } = await github.users.getAuthenticated();

    // Check if the user has admin access if admins are defined
    const isAdmin = process.env.ADMINS ? process.env.ADMINS.split(',').includes(userInfo.login) : false;

    // Check if the user belongs to at least one of the restricted organizations if they're defined
    const belongsToRestrictedOrgs = process.env.RESTRICTED_ORGS
      ? await checkUserOrganizationMembership(github, userInfo, process.env.RESTRICTED_ORGS.split(','))
      : false;

    // Determine if the user is authorized based on admin and organization membership
    const isAuthorized = isAdmin || belongsToRestrictedOrgs;

    // If not authorized, deny access
    if (!isAuthorized) {
      const policy = generateDenyPolicy(methodArn);
      callback(null, policy);
      return;
    }

    // If authorized, allow access by generating the appropriate IAM policy
    const policy = generateAllowPolicy(methodArn, userInfo);
    callback(null, policy);
  } catch (error) {
    // Handle any potential API errors, logging and denying access
    console.error('Error fetching user information from GitHub:', error);
    const policy = generateDenyPolicy(methodArn);
    callback(null, policy);
  }
};

// Helper functions to generate policies
const generateAllowPolicy = (methodArn, userInfo) => {
  // Generate an IAM policy granting access to "GET" and "OPTIONS" requests to /registry*
  // as well as "PUT" and "DELETE" requests based on admin and organization membership
  const policyDocument = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: ['execute-api:Invoke'],
        Resource: `${methodArn.split(':')[0]}:${methodArn.split(':')[1]}:${methodArn.split(':')[2]}/${url.parse(methodArn).path.replace('/*', '')}/*`,
        Principal: '*',
      },
      {
        Effect: 'Deny',
        Action: ['execute-api:Invoke'],
        Resource: `${methodArn.split(':')[0]}:${methodArn.split(':')[1]}:${methodArn.split(':')[2]}/*`,
        Principal: '*',
        Condition: {
          StringNotEquals: { 'aws:SourceArn': `arn:aws:execute-api:${process.env.REGION}:${process.env.AWS_ACCOUNT_ID}:/${process.env.STAGE}/*` },
        },
      },
    ],
  };

  // Append user details to the context object
  policyDocument.Statement[0].Resource += `?username=${encodeURIComponent(userInfo.login)}&avatar_url=${encodeURIComponent(userInfo.avatar_url)}&created_at=${encodeURIComponent(userInfo.created_at)}&updated_at=${encodeURIComponent(userInfo.updated_at)}`;

  // Return the constructed policy
  return {
    principalId: userInfo.login,
    policyDocument,
  };
};

const generateDenyPolicy = methodArn => ({
  principalId: 'Deny',
  policyDocument: {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Deny',
        Action: ['execute-api:Invoke'],
        Resource: methodArn,
      },
    ],
  },
});

// Helper function to check user's organization memberships
const checkUserOrganizationMembership = async (github, userInfo, organizations) => {
  // Fetch the user's memberhips with public visibility only
  const { data: memberships } = await github.orgs.listForAuthenticatedUser({
    type: 'all',
    per_page: 100,
    sort: 'joined',
  });

  // Check if the user belongs to any of the specified organizations
  return memberships.some(membership => organizations.includes(membership.org.login));
};