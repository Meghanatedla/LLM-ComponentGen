import os
import logging
import pylev
import requests
from github import Github

logger = logging.getLogger('tagbot-errors')
logger.setLevel(logging.INFO)

handler = Github(os.environ['GITHUB_TOKEN'])
issues_repo = handler.get_repo(os.environ['TAGBOT_ISSUES_REPO_NAME'])

TAGBOT_ISSUES_REPO = "Owner/Repo"  # Update to the actual repository name
THRESHOLD = 0.1  # Adjust this value to increase or decrease the error report similarity threshold.

def handler(event, context):
    image = event.get('image', 'N/A')
    repo = event.get('repo', 'N/A')
    run = event.get('run', 'N/A')
    stacktrace = event.get('stacktrace', 'N/A')

    logger.info(f"Error report received for {image} from {repo} with run URL {run} and stacktrace:\n{stacktrace}")

    duplicate_comment = _already_commented(stacktrace, repo)
    if duplicate_comment:
        logger.info(f"Duplicate error report for {repo} found. Adding comment to existing issue.")
        comment_text = f"Duplicate of [{duplicate_comment.html_url}]({duplicate_comment.html_url}) report from {repo} with run URL {run}."
        _add_duplicate_comment(duplicate_comment.issue, comment_text)
    else:
        logger.info(f"Creating new issue for error report from {repo}.")
        issue_title = f"Error report from {repo}"
        issue_body = f"Image ID: {image}\nRun URL: {run}\n\n```\n{stacktrace}\n```\n"
        _create_issue(issue_title, issue_body)

def _already_commented(stacktrace, repo):
    for issue in issues_repo.get_issues(state='open'):
        for comment in issue.get_comments():
            if repo in comment.body and stacktrace in comment.body:
                return comment
    return None

def _is_duplicate(stacktrace1, stacktrace2):
    distance = pylev.distance(stacktrace1, stacktrace2)
    length = len(stacktrace1) + len(stacktrace2)
    ratio = distance / length
    return ratio < THRESHOLD

def _find_duplicate(stacktrace):
    for issue in issues_repo.get_issues(state='open'):
        for comment in issue.get_comments():
            if _is_duplicate(stacktrace, comment.body):
                return comment
    return None

def _report_body(image, repo, run, stacktrace):
    return f"Image ID: {image}\nRun URL: {run}\n\n```\n{stacktrace}\n```\n"

def _add_duplicate_comment(issue, comment_text):
    issue.create_comment(comment_text)

def _create_issue(title, body):
    issues_repo.create_issue(title, body=body)