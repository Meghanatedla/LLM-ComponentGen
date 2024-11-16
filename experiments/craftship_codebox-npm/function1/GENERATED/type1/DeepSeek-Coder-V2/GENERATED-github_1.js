const { Octokit } = require("@octokit/rest");
const url = require("url");

// Environment variables
const {
  GITHUB_URL,
  GITHUB_CLIENT_ID,
  GITHUB_SECRET,
  RESTRICTED_ORGS,
  ADMINS,
} = process.env;

// Helper function to generate IAM policy
function generatePolicy(principalId, effect, resource, context = {}) {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context,
  };
}

// Main handler function
module.exports.handler = async (event, context, callback) => {
  const { methodArn, authorizationToken } = event;

  // Extract token from authorization header
  const token = authorizationToken?.split(" ")[1];
  if (!token) {
    return callback(null, generatePolicy("user", "Deny", methodArn));
  }

  // Initialize Octokit with GitHub credentials
  const octokit = new Octokit({
    baseUrl: GITHUB_URL,
    auth: {
      username: GITHUB_CLIENT_ID,
      password: GITHUB_SECRET,
    },
  });

  try {
    // Validate the token with GitHub
    const { data: user } = await octokit.users.getAuthenticated({
      headers: {
        authorization: `token ${token}`,
      },
    });

    const username = user.login;
    const avatarUrl = user.avatar_url;
    const timestamp = new Date().toISOString();

    // Check if user is in restricted organizations
    let isInRestrictedOrg = false;
    if (RESTRICTED_ORGS) {
      const orgs = await octokit.orgs.listForAuthenticatedUser({
        headers: {
          authorization: `token ${token}`,
        },
      });
      const restrictedOrgsList = RESTRICTED_ORGS.split(",");
      isInRestrictedOrg = orgs.data.some((org) =>
        restrictedOrgsList.includes(org.login)
      );
    }

    // Check if user is an admin
    const isAdmin = ADMINS?.split(",").includes(username) || false;

    // Generate policy based on access level
    const resource = methodArn.split("/").slice(0, -1).join("/") + "/*";
    const effect =
      isInRestrictedOrg || isAdmin ? "Allow" : "Deny";

    const policy = generatePolicy(username, effect, resource, {
      username,
      avatarUrl,
      timestamp,
    });

    callback(null, policy);
  } catch (error) {
    console.error("Authorization failed:", error);
    callback(null, generatePolicy("user", "Deny", methodArn));
  }
};
