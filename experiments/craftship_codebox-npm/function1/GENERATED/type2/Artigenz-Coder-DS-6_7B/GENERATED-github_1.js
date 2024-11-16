const { Octokit } = require("@octokit/rest");

exports.handler = async (event, context, callback) => {
  const githubAccessToken = event.headers['Authorization'].split(' ')[1]; // Extracting the Github Access Token

  try {
    const octokit = new Octokit({ auth: `token ${githubAccessToken}` });
    const response = await octokit.users.getAuthenticated(); // Get authenticated user details

    let isAdmin = false;
    let isRestrictedOrgMember = false;

    // Check if user is an admin
    if(process.env.ADMINS && process.env.ADMINS.includes(response.data.login)) {
      isAdmin = true;
    }

    // Check if user is member of restricted org
    if(process.env.RESTRICTED_ORGS) {
      const restrictedOrgs = JSON.parse(process.env.RESTRICTED_ORGS);
      const orgResponse = await octokit.orgs.checkMembershipForUser({ org: restrictedOrgs[0], username: response.data.login});
      
      if(orgResponse.status === 204) {
        isRestrictedOrgMember = true;
      }
    }

    // Generating the Policy Document
    const policyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: event.methodArn
        },
      ],
    };

    // Checking if user has enough permission
    if(!isAdmin &&!isRestrictedOrgMember) {
      policyDocument.Statement[0].Effect = 'Deny';
    } else {
      policyDocument.Statement[0].Resource += '/registry*';
      policyDocument.Statement[0].Action.push('execute-api:Invoke');
    }

    // Context Object
    const context = {
      username: response.data.login,
      avatar_url: response.data.avatar_url,
      timestamp: Math.floor(new Date().getTime() / 1000)
    };

    // Returning the Policy
    const authResponse = {
      principalId: response.data.id,
      policyDocument: policyDocument,
      context: context
    };

    callback(null, authResponse);
  } catch(err) {
    console.log(err);
    callback('Unauthorized');
  }
};