const { Octokit } = require('@octokit/rest')
const { URL } = require('url')

exports.handler = async function(event, context, callback) {
    // Extracting token from event headers
    const authHeader = event.headers['Authorization'] || ''
    const match = authHeader.match(/^Bearer (.+)$/)
  
    if (!match) {
        return callback("Unauthorized")
    }
  
    const token = match[1]
  
    try {
      // Creating Octokit instance
      const octokit = new Octokit({
          auth: `token ${token}`,
          baseUrl: process.env.githubUrl
      })
      
      // Verifying token
      await octokit.users.getAuthenticated()
      
      let adminsList = process.env.admins? process.env.admins.split(',') : []
      let restrictedOrgsList = process.env.restrictedOrgs? process.env.restrictedOrgs.split(',') : []
      
      // Fetching user data
      const response = await octokit.request('/user');
      const userData = response.data;
      
      let isUserAdmin = false;
      let isUserMemberOfRestrictedOrg = false;
      
      // Checking admin status
      if (adminsList.includes(userData.login)) {
          isUserAdmin = true;
      }
      
      // Checking organization membership
      if (restrictedOrgsList.length > 0) {
          const orgResponse = await octokit.request('/user/memberships/orgs');
          
          for (let i = 0; i < orgResponse.data.length; i++) {
              if (restrictedOrgsList.includes(orgResponse.data[i].organization.login)) {
                  isUserMemberOfRestrictedOrg = true;
                  break;
              }
          }
      }
      
      // Generating policy
      let policyDocument = {
          Version: '2012-10-17',
          Statement: [{
            Action: ['execute-api:Invoke'],
            Effect: 'Deny',
            Resource: event.methodArn
          }]
      };
      
      if (isUserAdmin || isUserMemberOfRestrictedOrg) {
          policyDocument.Statement[0].Effect = 'Allow';
          policyDocument.Statement[0].Resource = event.methodArn + '/GET/*';
          policyDocument.Context = {
              stringKey: JSON.stringify(userData)
          };
      }
      
      return callback(null, policyDocument);
    } catch (err) {
      console.error(err)
      return callback("Unauthorized")
    }
};