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
    Extracts necessary information from the event and passes it to _handle_report.
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
    Processes the error report.
    Checks for duplicates and either adds a comment to an existing issue or creates a new one.
    """
    issues_repo = github_client.get_repo(TAGBOT_ISSUES_REPO_NAME)
    duplicate_issue = _find_duplicate(issues_repo, stacktrace)
    
    if duplicate_issue and not _already_commented(duplicate_issue, repo):
        _add_duplicate_comment(duplicate_issue, repo, run, image, stacktrace)
    elif not duplicate_issue:
        _create_issue(issues_repo, repo, run, image, stacktrace)

def _already_commented(issue, repo):
    """
    Checks if the given issue already has a comment from the specified repository.
    """
    for comment in issue.get_comments():
        if f"Reported by {repo}" in comment.body:
            return True
    return False

def _is_duplicate(stacktrace1, stacktrace2):
    """
    Compares two stacktraces using Levenshtein distance to determine if they represent the same error.
    """
    distance = levenshtein(stacktrace1, stacktrace2)
    max_len = max(len(stacktrace1), len(stacktrace2))
    similarity_ratio = distance / max_len
    return similarity_ratio < 0.1

def _find_duplicate(issues_repo, stacktrace):
    """
    Searches for a duplicate error report among existing GitHub issues.
    """
    for issue in issues_repo.get_issues(state='open'):
        issue_stacktrace = _extract_stacktrace(issue.body)
        if issue_stacktrace and _is_duplicate(stacktrace, issue_stacktrace):
            return issue
    return None

def _extract_stacktrace(issue_body):
    """
    Extracts the stacktrace from the issue body.
    Assumes the stacktrace is enclosed in triple backticks (```).
    """
    start = issue_body.find('```')
    end = issue_body.rfind('```')
    if start != -1 and end != -1 and start != end:
        return issue_body[start+3:end].strip()
    return None

def _report_body(repo, run, image, stacktrace):
    """
    Formats the error report into a string.
    """
    return f"""
Reported by {repo}
CI Run URL: {run}
Image ID: {image}

```
{stacktrace}
```
"""

def _add_duplicate_comment(issue, repo, run, image, stacktrace):
    """
    Adds a comment to an existing GitHub issue, indicating a probable duplicate error.
    """
    comment_body = _report_body(repo, run, image, stacktrace)
    issue.create_comment(comment_body)
    logger.info(f"Comment added to issue #{issue.number} in {TAGBOT_ISSUES_REPO_NAME}")

def _create_issue(issues_repo, repo, run, image, stacktrace):
    """
    Creates a new GitHub issue for the error report.
    """
    issue_title = f"Error in {repo}"
    issue_body = _report_body(repo, run, image, stacktrace)
    issues_repo.create_issue(title=issue_title, body=issue_body)
    logger.info(f"New issue created in {TAGBOT_ISSUES_REPO_NAME}")