const githubUrl = process.env.GITHUB_URL || 'https://api.github.com'; // Github API url
const githubClientId = process.env.GITHUB_CLIENT_ID || ''; // Your GitHub Client ID
const githubSecret = process.env.GITHUB_SECRET || ''; // Your GitHub Secret
const restrictedOrgs = process.env.RESTRICTED_ORGS? process.env.RESTRICTED_ORGS.split(',') : []; // Comma separated list of restricted organizations
const admins = process.env.ADMINS? process.env.ADMINS.split(',') : []; // Comma separated list of admin usernames
const Octokit = require('@octokit/rest');
const url = require('url');
const aws = require('aws-sdk');
function generatePolicy(principalId, resource, effect='Allow', context) {
    var authResponse = {};
    authResponse.principalId = principalId;
    if (effect && resource) {
        var policyDocument = {};
        policyDocument.Version = '2012-10-17';
        policyDocument.Statement = [];
        var statementOne = {};
        statementOne.Action = 'execute-api:Invoke';
        statementOne.Effect = effect;
        statementOne.Resource = resource;
        policyDocument.Statement[0] = statementOne;
        authResponse.policyDocument = policyDocument;
    }
    authResponse.context = context;
    return authResponse;
}
exports.handler = async function(event, context, callback) {
    console.log("Event: ", JSON.stringify(event));

    // Get the authorization token from the headers
    const authHeader = event.headers["authorization"];

    if (!authHeader ||!authHeader.startsWith("Bearer ")) {
        console.log("Unauthorized");
        callback(null, "Unauthorized");
        return;
    }

    const token = authHeader.substr("Bearer ".length);

    // Create an instance of the GitHub API
    const octokit = new Octokit({
        auth: `token ${token}`,
        baseUrl: githubUrl
    });

    try {
        // Verify the token with GitHub
        const { data: { login }} = await octokit.users.getAuthenticated();
        
        // Check if the user is a member of any restricted organizations
        let isRestrictedMember = false;
        if (restrictedOrgs.length > 0) {
            const orgMemberships = await octokit.orgs.listForUser({ username: login });
            
            isRestrictedMember = orgMemberships.data.some((org) => restrictedOrgs.includes(org.login));
        }

        // Check if the user is listed as an admin
        let isAdmin = admins.includes(login);

        // Generate the IAM policy
        const policy = generatePolicy(login, event.methodArn, isAdmin ||!isRestrictedMember? 'Allow' : 'Deny', {
            username: login,
            avatar: `https://github.com/${login}.png?size=40`,
            timestamp: new Date().toISOString(),
        });

        console.log("Policy: ", JSON.stringify(policy));
        callback(null, policy);
    } catch (err) {
        console.log("Error: ", err);
        callback(null, "Error: Invalid token");
    }
};