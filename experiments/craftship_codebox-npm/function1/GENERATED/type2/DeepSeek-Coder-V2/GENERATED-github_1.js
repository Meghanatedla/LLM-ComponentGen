// src/authorizer/github.js

const { Octokit } = require("@octokit/rest");
const url = require("url");

// Environment variables
const GITHUB_URL = process.env.githubUrl;
const GITHUB_CLIENT_ID = process.env.githubClientId;
const GITHUB_SECRET = process.env.githubSecret;
const RESTRICTED_ORGS = process.env.restrictedOrgs ? process.env.restrictedOrgs.split(",") : [];
const ADMINS = process.env.admins ? process.env.admins.split(",") : [];

// Helper function to generate IAM policy
function generatePolicy(principalId, effect, resource, context = {}) {
    return {
        principalId: principalId,
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
        context: context,
    };
}

// Main handler function
module.exports.handler = async (event, context, callback) => {
    try {
        // Extract and validate the GitHub access token
        const authHeader = event.authorizationToken;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return callback(null, generatePolicy("user", "Deny", event.methodArn));
        }
        const token = authHeader.split(" ")[1];

        // Initialize Octokit with basic authentication
        const octokit = new Octokit({
            auth: {
                username: GITHUB_CLIENT_ID,
                password: GITHUB_SECRET,
            },
        });

        // Validate the token with GitHub
        const userResponse = await octokit.users.getAuthenticated({ headers: { Authorization: `token ${token}` } });
        const user = userResponse.data;

        // Check organization membership if restrictedOrgs is set
        let isOrgMember = false;
        if (RESTRICTED_ORGS.length > 0) {
            const orgsResponse = await octokit.orgs.listForAuthenticatedUser({ headers: { Authorization: `token ${token}` } });
            const orgs = orgsResponse.data.map(org => org.login);
            isOrgMember = orgs.some(org => RESTRICTED_ORGS.includes(org));
        }

        // Check admin status if admins is set
        const isAdmin = ADMINS.includes(user.login);

        // Determine access level
        const method = event.methodArn.split(":")[5].split("/")[2];
        const resource = event.methodArn;
        let effect = "Deny";

        if (method === "GET") {
            effect = "Allow"; // Allow GET for all authenticated users
        } else if ((isOrgMember || isAdmin) && (method === "PUT" || method === "DELETE")) {
            effect = "Allow"; // Allow PUT and DELETE for org members or admins
        }

        // Generate and return the IAM policy
        const policy = generatePolicy(user.login, effect, resource, {
            username: user.login,
            avatarUrl: user.avatar_url,
            timestamp: new Date().toISOString(),
        });
        callback(null, policy);
    } catch (error) {
        console.error("Authorization error:", error);
        callback(null, generatePolicy("user", "Deny", event.methodArn));
    }
};