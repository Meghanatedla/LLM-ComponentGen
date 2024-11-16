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
    Lambda function entry point.
    """
    image = event.get('image')
    repo = event.get('repo')
    run = event.get('run')
    stacktrace = event.get('stacktrace')

    if not all([image, repo, run, stacktrace]):
        logger.error("Missing required fields in event.")
        return {"statusCode": 400, "body": "Missing required fields in event."}

    _handle_report(image, repo, run, stacktrace)
    return {"statusCode": 200, "body": "Report processed successfully."}

def _handle_report(image, repo, run, stacktrace):
    """
    Process the error report.
    """
    duplicate_issue = _find_duplicate(stacktrace)
    if duplicate_issue:
        if not _already_commented(duplicate_issue, repo):
            _add_duplicate_comment(duplicate_issue, repo, run, image, stacktrace)
    else:
        _create_issue(repo, run, image, stacktrace)

def _already_commented(issue, repo):
    """
    Check if the repository has already commented on the issue.
    """
    for comment in issue.get_comments():
        if repo in comment.body:
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
    repo = github_client.get_repo(TAGBOT_ISSUES_REPO_NAME)
    for issue in repo.get_issues(state='open'):
        issue_stacktrace = _extract_stacktrace(issue.body)
        if issue_stacktrace and _is_duplicate(stacktrace, issue_stacktrace):
            return issue
    return None

def _extract_stacktrace(issue_body):
    """
    Extract stacktrace from the issue body.
    """
    # This is a placeholder. You might need a more sophisticated method to extract the stacktrace.
    return issue_body.split('Stacktrace:')[-1].strip()

def _report_body(repo, run, image, stacktrace):
    """
    Format the error report into a string.
    """
    return f"""
Repository: {repo}
Run URL: {run}
Image ID: {image}
Stacktrace:
{stacktrace}
"""

def _add_duplicate_comment(issue, repo, run, image, stacktrace):
    """
    Add a comment to an existing GitHub issue.
    """
    body = _report_body(repo, run, image, stacktrace)
    issue.create_comment(f"Duplicate error report from {repo}:\n{body}")

def _create_issue(repo, run, image, stacktrace):
    """
    Create a new GitHub issue for the error report.
    """
    repo = github_client.get_repo(TAGBOT_ISSUES_REPO_NAME)
    title = f"Error report from {repo}"
    body = _report_body(repo, run, image, stacktrace)
    repo.create_issue(title=title, body=body)