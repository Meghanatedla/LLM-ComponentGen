const Octokit = require('@octokit/rest');
const url = require('url')

const octokit = new Octokit({
  baseUrl: process.env.CODEBOX_GITHUB_URL,
  auth: {
    clientId: process.env.CODEBOX_GITHUB_CLIENT_ID,
    clientSecret: process.env.CODEBOX_GITHUB_SECRET
  }
});

let restrictedOrgs = process.env.CODEBOX_RESTRICTED_ORGS.split(",");
let admins = process.env.CODEBOX_ADMINS.split(",");

module.exports.githubAuth = async function(event, context, callback) {
  let methodArn = event.methodArn;
  let token = event.authorizationToken;

  // Step 1: Token Extraction
  if(!token || !token.startsWith('Bearer ')) {
    return denyPolicy(methodArn, callback);  // Malformed or missing token
  }

  token = token.slice(7);  // Extract token from "Bearer <token>"

  // Step 2 + 3: GitHub Authentication & Token Validation
  try {
    let user = await octokit.users.getAuthenticated();

    // Validation failed if no user
    if (!user) return denyPolicy(methodArn, callback);
  } catch (error) {
    console.error(`Couldn't validate the Github access token - `, error);
    return denyPolicy(methodArn, callback);
  }

  // Step 4: Organization Membership Check (Conditional)
  if (restrictedOrgs.length > 0) {
    let member = false;
    for (let i = 0; i < restrictedOrgs.length; i++) {
      const org = restrictedOrgs[i];
      try {
        let result = await octokit.orgs.checkMembershipForUser({
          org: org,
          username: user.login
        });
        if (result.status === 204) { // HTTP 204: No content (Membership exists).
          member = true;
          break;
        }
      } catch (error) {
        console.error(`Error when checking Github organization membership - `, error);
        continue; // Try the next organization.
      }
    }
    if (!member) return denyPolicy(methodArn, callback); // Denied if not a member in any restricted orgs
  }

  // Step 5: Admin Check (Conditional)
  let permission = null;
  if (admins.indexOf(user.login) !== -1) {
    permission = 'Admin'
  } else {
    permission = 'User'   // All others are users
  }

  // Step 6: Policy Generation
  let policy = buildPolicy(user, permission, token, methodArn);

  // Step 7: Callback Invocation
  callback(null, policy);
}

// Helper Function to generate Deny IAM Policy
function denyPolicy(methodArn, callback) {
  let policy = {
    principalId: 'user',
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: 'Deny',
          Resource: methodArn
        }
      ]
    }
  };
  callback(null, policy);
}

// Helper Function to build IAM Policy
function buildPolicy(user, permission, token, methodArn) {
  let tmp = methodArn.split(':');
  let apiGatewayArnTmp = tmp[5].split('/');
  let awsAccountId = tmp[4];
  let awsRegion = tmp[3];
  let restApiId = apiGatewayArnTmp[0];
  let stage = apiGatewayArnTmp[1];
  let httpMethod = '*';
  let resource = '*'; 
    
  let policy = {
    principalId: user.login,
    policyDocument: {
      Version: '2012-10-17',
      Statement: []
    },
    context: {
      user: JSON.stringify(user)
    }
  };
  
  let statementOne = {
    Action: 'execute-api:Invoke',
    Effect: permission === 'Admin' ? 'Allow' : 'Deny',
    Resource: `arn:aws:execute-api:${awsRegion}:${awsAccountId}:${restApiId}/${stage}/${httpMethod}/registry`
  };

  policy.policyDocument.Statement[0] = statementOne;

  return policy;
}