// Import necessary dependencies
const Octokit = require('@octokit/rest');
const url = require('url');

// Define the GitHub Authorization function
exports.handler = async (event, context, callback) => {
    // Extract authorization token from the event
    let authorizationToken = event.authorizationToken;
    
    // If token is missing or malformed, return a "Deny" policy
    if (!authorizationToken || !authorizationToken.startsWith('Bearer ')) {
        return callback("Unauthorized");
    }
    
    // Extract the GitHub access token
    let accessToken = authorizationToken.substring('Bearer '.length);
    
    try {
        // Initialize Octokit with GitHub credentials
        const octokit = new Octokit({
            auth: {
                username: process.env.githubClientId,
                password: process.env.githubSecret
            }
        });
        
        // Validate the access token against GitHub
        let { data } = await octokit.oauthAuthorizations.checkAuthorization({
            accessToken
        });
        
        // If validation fails, return a "Deny" policy
        if (!data || !data.valid) {
            return callback("Unauthorized");
        }
        
        // Check organization membership if restrictedOrgs is set
        if (process.env.restrictedOrgs) {
            let orgs = await octokit.users.listOrgsForAuthenticatedUser();
            let restrictedOrgs = process.env.restrictedOrgs.split(',');
            
            // Check if user belongs to any restricted organizations
            if (orgs.data.some(org => restrictedOrgs.includes(org.login))) {
                // Generate IAM policy
                const policy = generatePolicy(effect = 'Allow', methodArn, data);
                return callback(null, policy);
            }
        }
        
        // Check admin status if admins list is set
        if (process.env.admins) {
            let admins = process.env.admins.split(',');
            // Check if user is in admin list
            if (admins.includes(data.login)) {
                // Generate IAM policy granting admin access
                const policy = generatePolicy(effect = 'Allow', methodArn, data, isAdmin = true);
                return callback(null, policy);
            }
        }
        
        // Generate IAM policy for read-only access
        const policy = generatePolicy(effect = 'Allow', methodArn, data);
        return callback(null, policy);
    } catch (error) {
        console.error(error);
        return callback("Internal server error");
    }
};

// Helper function to generate IAM policy
const generatePolicy = (effect, resource, user, isAdmin = false) => {
    // Define the base policy document
    const policyDocument = {
        Version: '2012-10-17',
        Statement: [
            {
                Action: 'execute-api:Invoke',
                Effect: effect, 
                Resource: resource
            }
        ]
    };

    // Add user details to the context object
    const userContext = {
        username: user.login,
        avatar_url: user.avatar_url,
        timestamp: Date.now()
    };

    // Add isAdmin status to the context if applicable
    if (isAdmin) {
        userContext.isAdmin = true;
    }
    
    const policy = {
        principalId: user.login,
        policyDocument,
        context: userContext
    };

    return policy;
};