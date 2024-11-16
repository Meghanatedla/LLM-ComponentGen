// This is the serverless function for GitHub Authorization
// It acts as an authorizer for an AWS API Gateway, verifying user identity and permissions via GitHub

const { Octokit } = require('@octokit/rest');
const url = require('url');

const generatePolicy = (principalId, effect, resource, context) => {
    const authResponse = {
        principalId: principalId,
        policyDocument: {
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: effect,
                    Resource: resource
                }
            ]
        },
        context: context
    };
    return authResponse;
};

exports.handler = async (event, context, callback) => {
    // Extract necessary information from the event
    const { methodArn, authorizationToken } = event;

    try {
        // Token Extraction
        if (!authorizationToken || !authorizationToken.startsWith('Bearer ')) {
            return callback('Unauthorized');
        }
        const accessToken = authorizationToken.split(' ')[1];

        // GitHub Authentication
        const octokit = new Octokit({
            auth: {
                username: process.env.githubClientId,
                password: process.env.githubSecret
            }
        });

        // Token Validation
        const userResponse = await octokit.users.getAuthenticated();
        const username = userResponse.data.login;

        // Organization Membership Check
        if (process.env.restrictedOrgs) {
            const orgsResponse = await octokit.orgs.listForAuthenticatedUser();
            const orgs = orgsResponse.data.map(org => org.login);
            
            const allowedOrgs = process.env.restrictedOrgs.split(',');
            const isMember = allowedOrgs.some(allowedOrg => orgs.includes(allowedOrg));
            if (!isMember) return callback(null, generatePolicy(username, 'Deny', methodArn, {})); 
        }

        // Admin Check
        if (process.env.admins) {
            const adminUsers = process.env.admins.split(',');
            if (adminUsers.includes(username)) {
                return callback(null, generatePolicy(username, 'Allow', methodArn, { isAdmin: true }));
            }
        }

        // Policy Generation
        const effect = methodArn.includes('/registry*') ? 'Allow' : 'Deny';
        const policy = generatePolicy(username, effect, methodArn, { username, timestamp: new Date().toISOString() });

        // Return IAM policy
        return callback(null, policy);
    } catch (error) {
        console.error(error);
        return callback('Unauthorized');
    }
};