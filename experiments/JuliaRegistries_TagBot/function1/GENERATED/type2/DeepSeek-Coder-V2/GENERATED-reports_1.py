import os
import logging
from github import Github
from pylev import levenshtein

# Environment variables
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
TAGBOT_ISSUES_REPO_NAME = os.getenv("TAGBOT_ISSUES_REPO_NAME")

# Logger setup
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# GitHub client
gh = Github(GITHUB_TOKEN)

def handler(event, context):
    """
    Entry point for the Lambda function.
    Receives an event containing error report information and processes it.
    """
    image_id = event.get("image")
    repo_name = event.get("repo")
    run_url = event.get("run")
    stacktrace = event.get("stacktrace")

    if not all([image_id, repo_name, run_url, stacktrace]):
        logger.error("Missing required fields in event.")
        return

    _handle_report(image_id, repo_name, run_url, stacktrace)

def _handle_report(image_id, repo_name, run_url, stacktrace):
    """
    Processes the error report. Checks for duplicates and handles accordingly.
    """
    issues_repo = gh.get_repo(TAGBOT_ISSUES_REPO_NAME)
    duplicate_issue = _find_duplicate(issues_repo, stacktrace)

    if duplicate_issue:
        if not _already_commented(duplicate_issue, repo_name):
            _add_duplicate_comment(duplicate_issue, repo_name, run_url, image_id, stacktrace)
    else:
        _create_issue(issues_repo, repo_name, run_url, image_id, stacktrace)

def _already_commented(issue, repo_name):
    """
    Checks if a given GitHub issue already has a comment from the specified repository.
    """
    for comment in issue.get_comments():
        if f"Reported by {repo_name}" in comment.body:
            return True
    return False

def _is_duplicate(stacktrace1, stacktrace2):
    """
    Compares two stacktraces using Levenshtein distance to determine if they represent the same error.
    """
    distance = levenshtein(stacktrace1, stacktrace2)
    max_length = max(len(stacktrace1), len(stacktrace2))
    similarity_ratio = distance / max_length
    return similarity_ratio < 0.1

def _find_duplicate(issues_repo, stacktrace):
    """
    Searches for a duplicate error report among existing GitHub issues.
    """
    for issue in issues_repo.get_issues(state="open"):
        if _is_duplicate(stacktrace, issue.body):
            return issue
    return None

def _report_body(repo_name, run_url, image_id, stacktrace):
    """
    Formats the error report into a string.
    """
    return (
        f"**Repository:** {repo_name}\n"
        f"**CI Run URL:** {run_url}\n"
        f"**Image ID:** {image_id}\n"
        f"**Stacktrace:**\n```\n{stacktrace}\n```"
    )

def _add_duplicate_comment(issue, repo_name, run_url, image_id, stacktrace):
    """
    Adds a comment to an existing GitHub issue, indicating a probable duplicate error.
    """
    body = _report_body(repo_name, run_url, image_id, stacktrace)
    issue.create_comment(f"**Duplicate Report**\n\n{body}\n\nReported by {repo_name}")

def _create_issue(issues_repo, repo_name, run_url, image_id, stacktrace):
    """
    Creates a new GitHub issue for the error report.
    """
    title = f"Error in {repo_name}"
    body = _report_body(repo_name, run_url, image_id, stacktrace)
    issues_repo.create_issue(title=title, body=body)

# Assuming the following environment variables are set:
# GITHUB_TOKEN: GitHub personal access token with repo scope
# TAGBOT_ISSUES_REPO_NAME: The repository where issues will be created (e.g., "org/repo")