// Import External Dependencies
import { Octokit } from '@octokit/rest';
import Url from 'url';

// Helper function to generate IAM policy
function generatePolicy(username, effect, resource, context){
  return {
    principalId: username,
    policyDocument: {
      Version: '2012-10-17', // default version for IAM policy
      Statement: [{
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: resource,
      }],
    },
    context: context,
  };
}

// Main Lambda function
export default async ({
  methodArn,
  authorizationToken,
}, context, callback) => {
  
  // Extract GitHub Token
  const tokenMatches = authorizationToken.match(/^Bearer (\S+)$/);
  if (!tokenMatches) {
    callback('Unauthorized');
  }
  const githubToken = tokenMatches[1];

  // Authenticate with GitHub
  const octokit = new Octokit({ 
    baseUrl: process.env.githubUrl,
    auth: {
      clientId: process.env.githubClientId,
      clientSecret: process.env.githubSecret,
    }
  });

  // Validate GitHub token
  let userInfo;
  try {
    const response = await octokit.oauthAuthorizations.check({
      access_token: githubToken,
    });
    userInfo = response.data;
  } catch (error) {
    callback('Unauthorized');
  }

  // Check user's organization membership, If 'restrictedOrgs' is defined
  let orgAllowed = true;
  if (process.env.restrictedOrgs) {
    const { data: orgs } = await octokit.orgs.listForAuthenticatedUser({ per_page: 100 });
    orgAllowed = process.env.restrictedOrgs.split(',').some(restrictedOrg => orgs.some(({ login }) => login === restrictedOrg));
    if (!orgAllowed) {
      callback('Unauthorized');
    }
  }

  // Check if user is an admin, If 'admins' is defined
  const isAdmin = process.env.admins ? process.env.admins.split(',').includes(userInfo.user.login) : false;
  
  // Construct policy
  const policy = generatePolicy(userInfo.user.login, 'Allow', methodArn, {
    username: userInfo.user.login,
    avatar_url: userInfo.user.avatar_url,
    last_authorized: Date.now(),
  });

  // Additional allowance for admins
  if (orgAllowed || isAdmin) {
    const resource = methodArn.substring(0, methodArn.indexOf('/', 2));
    policy['policyDocument']['Statement'].push({
      Action: ['execute-api:Invoke'],
      Effect: 'Allow',
      Resource: [`${resource}/PUT/registry*`, `${resource}/DELETE/registry*`],
    });
  }

  callback(null, policy);
};