import os
import pylev
import github
import logging

# Set up logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)

def _handle_report(event):
    """Handles incoming error report."""
    
    # Extract necessary information from the event
    image = event['image']
    repo = event['repo']
    run = event['run']
    stacktrace = event['stacktrace']
    
    # Authenticate with GitHub
    gh = github.Github(os.environ['GITHUB_TOKEN'])
    
    # Get the target repository
    target_repo = gh.get_repo(os.environ['TAGBOT_ISSUES_REPO_NAME'])
    
    # Find a potential duplicate issue
    duplicate_issue = _find_duplicate(target_repo, stacktrace)
    
    if duplicate_issue:
        # If a duplicate is found, check whether the reporter has already commented
        if not _already_commented(duplicate_issue, repo):
            # Add a comment to the issue
            _add_duplicate_comment(duplicate_issue, repo, run, image, stacktrace)
            
    else:
        # If no duplicate is found, create a new issue
        _create_issue(target_repo, repo, run, image, stacktrace)
        
def _find_duplicate(repository, stacktrace):
    """Finds a duplicate issue in the repository."""
    
    for issue in repository.get_issues():
        # Skip non-error issues
        if 'Error' not in issue.title:
            continue
            
        # Extract the stacktrace from the issue body
        issue_stacktrace = _extract_stacktrace(issue.body)
        
        # Calculate the Levenshtein distance between the provided stacktrace and the issue's stacktrace
        distance = pylev.levenshtein(stacktrace, issue_stacktrace)
        
        # If the distance is less than a certain threshold, consider the issue a match
        if distance < len(stacktrace) * 0.1:
            return issue
            
    return None
    
def _extract_stacktrace(issue_body):
    """Extracts a stacktrace from the issue body."""
    
    # Placeholder implementation, replace with actual extraction logic
    pass
    
def _already_commented(issue, repo):
    """Checks if a repo has already commented on an issue."""
    
    # Placeholder implementation, replace with actual checking logic
    pass
    
def _add_duplicate_comment(issue, repo, run, image, stacktrace):
    """Adds a comment to an issue indicating a possible duplicate."""
    
    # Placeholder implementation, replace with actual comment addition logic
    pass
    
def _create_issue(repository, repo, run, image, stacktrace):
    """Creates a new issue in the repository."""
    
    # Placeholder implementation, replace with actual issue creation logic
    pass