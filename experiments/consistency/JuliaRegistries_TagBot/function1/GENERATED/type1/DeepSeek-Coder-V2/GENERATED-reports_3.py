import os
import logging
from github import Github
from pylev import levenshtein

# Environment variables
GITHUB_TOKEN = os.getenv('GITHUB_TOKEN')
TAGBOT_ISSUES_REPO_NAME = os.getenv('TAGBOT_ISSUES_REPO_NAME')

# Initialize GitHub client
github_client = Github(GITHUB_TOKEN)

# Logger setup
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def handler(event, context):
    """
    Entry point for the Lambda function.
    """
    image = event.get('image')
    repo = event.get('repo')
    run = event.get('run')
    stacktrace = event.get('stacktrace')
    
    if not all([image, repo, run, stacktrace]):
        logger.error("Missing required fields in event.")
        return
    
    _handle_report(image, repo, run, stacktrace)

def _handle_report(image, repo, run, stacktrace):
    """
    Process the error report.
    """
    duplicate_issue = _find_duplicate(stacktrace)
    
    if duplicate_issue:
        if not _already_commented(duplicate_issue, repo):
            _add_duplicate_comment(duplicate_issue, repo, run, image, stacktrace)
        else:
            logger.info(f"Duplicate issue already commented by {repo}.")
    else:
        _create_issue(repo, run, image, stacktrace)

def _already_commented(issue, repo):
    """
    Check if the repository has already commented on the issue.
    """
    for comment in issue.get_comments():
        if f"Reported by {repo}" in comment.body:
            return True
    return False

def _is_duplicate(stacktrace1, stacktrace2):
    """
    Compare two stacktraces using Levenshtein distance.
    """
    distance = levenshtein(stacktrace1, stacktrace2)
    max_len = max(len(stacktrace1), len(stacktrace2))
    similarity_ratio = distance / max_len
    return similarity_ratio < 0.1

def _find_duplicate(stacktrace):
    """
    Search for a duplicate error report among existing GitHub issues.
    """
    issues_repo = github_client.get_repo(TAGBOT_ISSUES_REPO_NAME)
    for issue in issues_repo.get_issues(state='open'):
        issue_stacktrace = _extract_stacktrace_from_issue(issue)
        if _is_duplicate(stacktrace, issue_stacktrace):
            return issue
    return None

def _extract_stacktrace_from_issue(issue):
    """
    Extract stacktrace from the issue body.
    """
    # Assuming the stacktrace is in the issue body under a specific format
    # This is a placeholder implementation
    return issue.body.split("Stacktrace:")[-1].strip()

def _report_body(repo, run, image, stacktrace):
    """
    Format the error report into a string.
    """
    return f"""
    Reported by {repo}
    CI Run URL: {run}
    Image ID: {image}
    Stacktrace:
    ```
    {stacktrace}
    ```
    """

def _add_duplicate_comment(issue, repo, run, image, stacktrace):
    """
    Add a comment to an existing GitHub issue.
    """
    comment_body = _report_body(repo, run, image, stacktrace)
    issue.create_comment(comment_body)
    logger.info(f"Commented on duplicate issue {issue.number}.")

def _create_issue(repo, run, image, stacktrace):
    """
    Create a new GitHub issue for the error report.
    """
    issues_repo = github_client.get_repo(TAGBOT_ISSUES_REPO_NAME)
    issue_title = f"Error in {repo}"
    issue_body = _report_body(repo, run, image, stacktrace)
    issues_repo.create_issue(title=issue_title, body=issue_body)
    logger.info(f"Created new issue for {repo}.")