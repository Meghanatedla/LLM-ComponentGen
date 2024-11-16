// Import required modules
const { Octokit } = require("@octokit/rest");

/**
 * GitHub authorization handler for an AWS API Gateway
 * @param {string} methodArn - Amazon Resource Name for the invoked API method
 * @param {string} authorizationToken - Authorization token passed by the client
 * @param {callback} callback - Function to invoke when the authorization is complete
 */
exports.handler = function githubAuthorization(event, context, callback) {
  // Parse the authorization token
  const authToken = event.authorizationToken.split(" ")[1];
  const githubToken = `${process.env.GITHUB_CLIENT_ID}:${process.env.GITHUB_SECRET}`;
  const githubUrl = process.env.GITHUB_URL || "https://api.github.com";

  // Create an Octokit instance for interacting with GitHub API
  const octokit = new Octokit({ auth: `token ${authToken}` });

  // Extract and validate the GitHub access token
  const { status, data: userInfo } = octokit.users.getAuthenticated({
    headers: {
      authorization: `Basic ${Buffer.from(githubToken).toString("base64")}`,
    },
  });

  if (status !== 200) {
    const policy = generatePolicy("Deny", methodArn, context);
    callback(null, policy);
    return;
  }

  // Check organization memberships if restrictedOrgs are defined
  if (process.env.RESTRICTED_ORGS) {
    const restrictedOrgs = process.env.RESTRICTED_ORGS.split(",");
    octokit.orgs
      .listForAuthenticatedUser({
        headers: {
          authorization: `token ${authToken}`,
        },
        sort: "joined",
      })
      .then((orgs) => {
        const isRestrictedOrgMember = orgs.data.some((org) =>
          restrictedOrgs.includes(org.login)
        );
        handleAuth(isRestrictedOrgMember, userInfo);
      })
      .catch((error) => {
        // Handle error while checking organization memberships
        console.error("Error checking organization memberships:", error);
        const policy = generatePolicy("Deny", methodArn, context);
        callback(null, policy);
      });
  } else {
    // No organization restriction; allow the user if admin check passes
    handleAuth(false, userInfo);
  }

  /**
   * Handles the authorization result and generates the policy
   * @param {boolean} isRestrictedOrgMember - True if the user is a member of a restricted organization
   * @param {object} userInfo - Object containing user information fetched from GitHub
   */
  function handleAuth(isRestrictedOrgMember, userInfo) {
    if (process.env.ADMINS) {
      const admins = process.env.ADMINS.split(",");
      const isAdmin = admins.includes(userInfo.login);

      const policy = generatePolicy(isAdmin || !isRestrictedOrgMember ? "Allow" : "Deny", methodArn, context, userInfo);
      callback(null, policy);
    } else {
      // No admin check required; allow access
      const policy = generatePolicy("Allow", methodArn, context, userInfo);
      callback(null, policy);
    }
  }
};

/**
 * Generates an IAM policy document
 * @param {string} effect - The effect ("Allow" or "Deny") for the policy
 * @param {string} methodArn - Amazon Resource Name for the invoked API method
 * @param {object} context - Optional context object containing user details
 * @param {object} userInfo - Optional object containing user information fetched from GitHub
 * @returns {object} The IAM policy document
 */
function generatePolicy(effect, methodArn, context = {}, userInfo = {}) {
  const policyDocument = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: effect,
        Action: "execute-api:Invoke",
        Resource: methodArn,
        Condition: {},
      },
    ],
  };

  if (context.user) {
    policyDocument.Statement[0].Principal = {
      AWS: `arn:aws:iam::${context.user.accountId}:user/${context.user.userName}`,
    };
  }

  if (Object.keys(context).length > 0) {
    policyDocument.Statement[0].Resource = methodArn.replace("execute-api:Invoke", "execute-api:*");
    policyDocument.Statement[0].Context = context;
  }

  if (Object.keys(userInfo).length > 0) {
    policyDocument.Statement[0].Context.user = userInfo;
  }

  return policyDocument;
}