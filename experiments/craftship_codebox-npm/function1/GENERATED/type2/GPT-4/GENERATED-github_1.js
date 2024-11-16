// Load dependencies
const Octokit = require('@octokit/rest');
const { URL } = require('url');

// Main Function
exports.handler = async (event, context, callback) => {

    // Extract token from authorizationToken header
    const tokenRegex = /^Bearer\s(.*)$/i;
    const match = event.authorizationToken.match(tokenRegex);
    if (!match) {
        // Return Deny policy if header is invalid
        return callback(null, generatePolicy('user', 'Deny', event.methodArn));
    }
    const githubToken = match[1];

    // Set GitHub API Client
    const octokit = new Octokit({
        baseUrl: process.env.githubUrl,
        auth: {
            username: process.env.githubClientId,
            password: process.env.githubSecret
        }
    });

    // Validate GitHub Token
    let user;
    try {
        const { data } = await octokit.checks.checkToken({
            access_token: githubToken
        });
        user = data;
    } catch (error) {
        // Return Deny policy if token is invalid
        return callback(null, generatePolicy('user', 'Deny', event.methodArn));
    }

    // Check user's org membership if environment var `restrictedOrgs` is set
    let isMember = false;
    if (process.env.restrictedOrgs) {
        const orgs = process.env.restrictedOrgs.split(',');
        for (let org of orgs) {
            const { data: isOrgMember } = await octokit.orgs.checkMembershipForUser({
                username: user.login,
                org: org
            });
            if (isOrgMember) {
                isMember = true;
                break;
            }
        }
    }

    // If `restrictedOrgs` is set, but user is not a member of any org, deny access
    if (process.env.restrictedOrgs && !isMember) {
        return callback(null, generatePolicy('user', 'Deny', event.methodArn));
    }

    // Check user's admin status if environment var `admins` is set
    const isAdmin = process.env.admins ? process.env.admins.split(',').includes(user.login) : false;

    // Generate IAM policy
    let effect = 'Allow';
    const policy = generatePolicy(user.login, effect, event.methodArn, user, isAdmin, isMember);

    callback(null, policy);
};

// Helper function to generate IAM policy
const generatePolicy = (principalId, effect, methodArn, userData = null, isAdmin = false, isMember = false) => {

    const policy = {
        principalId,
        policyDocument: {
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: effect,
                    Resource: methodArn.includes('/GET/') ? methodArn : 'arn:aws:execute-api:*:*:/*'
                }
            ]
        }
    };

    // Add additional permissions for admins/members
    if (isAdmin || isMember) {
        const putDelMethodArn = new URL(methodArn);
        putDelMethodArn.pathname = putDelMethodArn.pathname.replace('/GET/', '/PUT/');
        policy.policyDocument.Statement.push({
            Action: 'execute-api:Invoke',
            Effect: effect,
            Resource: putDelMethodArn.href
        });
        const delMethodArn = new URL(methodArn);
        delMethodArn.pathname = delMethodArn.pathname.replace('/GET/', '/DELETE/');
        policy.policyDocument.Statement.push({
            Action: 'execute-api:Invoke',
            Effect: effect,
            Resource: delMethodArn.href
        });
    }

    if (userData) {
        policy.context = {
            username: userData.login,
            avatarUrl: userData.avatar_url,
            createdAt: userData.created_at
        };
    }

    return policy;
};