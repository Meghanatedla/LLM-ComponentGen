import os
import sys
import logging
import github
import Levenshtein
from github import Github

TAGBOT_ISSUES_REPO_NAME = os.getenv("TAGBOT_ISSUES_REPO_NAME")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def _is_duplicate(stacktrace1, stacktrace2):
    ratio = Levenshtein.ratio(stacktrace1, stacktrace2)
    return ratio < 0.1

def _already_commented(issue, repository):
    for comment in issue.get_comments():
        if repository in comment.body:
            return True
    return False

def _find_duplicate(stacktrace):
    github_client = Github(GITHUB_TOKEN)
    repo = github_client.get_repo(TAGBOT_ISSUES_REPO_NAME)

    for issue in repo.get_issues():
        if _is_duplicate(stacktrace, issue.body):
            if not _already_commented(issue, repo.name):
                _add_duplicate_comment(issue)
            return True
    return False

def _report_body(event):
    return f"Repository: {event['repo']}\nRun URL: {event['run']}\nImage ID: {event['image']}\nStacktrace: {event['stacktrace']}"

def _add_duplicate_comment(issue):
    issue.create_comment("Probable duplicate error. Please check.")

def _create_issue(event):
    github_client = Github(GITHUB_TOKEN)
    repo = github_client.get_repo(TAGBOT_ISSUES_REPO_NAME)
    issue_title = f"Error in {event['repo']}"
    issue_body = _report_body(event)
    repo.create_issue(title=issue_title, body=issue_body)

def _handle_report(event):
    stacktrace = event['stacktrace']
    if not _find_duplicate(stacktrace):
        _create_issue(event)

def handler(event, context):
    event_data = event['data']
    _handle_report(event_data, context)

if __name__ == "__main__":
    event = {
        "image": "container_image_id",
        "repo": "GitHub_repository",
        "run": "CI_run_URL",
        "stacktrace": "Error_stack_trace"
    }
    context = None
    handler(event, context)