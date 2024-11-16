# The following code is my implementation of the serverless function as I understood from the README. 
# I am making the assumption that we already have access to 'github' and 'pylev' modules.

import os
import re
import logging
import github
import pylev

logger = logging.getLogger(__name__)
gh = github.Github(os.environ["GITHUB_TOKEN"])
repo = gh.get_repo(os.environ["TAGBOT_ISSUES_REPO_NAME"])

def handler(event, _context):
    """
    Handler for serverless function.
    Executes when function is triggered.
    """
    image = event["image"]
    repo_name = event["repo"]
    run = event["run"]
    stacktrace = event["stacktrace"]
    _handle_report(image, repo_name, run, stacktrace)


def _handle_report(image, repo, run, stacktrace):
    """
    Handles the report by either appending to existing issue or creating a new issue
    """
    for issue in repo.get_issues(state="open"):
        if _already_commented(repo, issue):
            continue
        body = issue.body.rsplit("Stacktrace:", 1)[-1]
        if _is_duplicate(stacktrace, body):
            _add_duplicate_comment(repo, run, image, stacktrace, issue)
            return
    _create_issue(repo, run, image, stacktrace)


def _already_commented(repo, issue):
    """
    Checks whether or not an issue has been commented
    """
    comment_string = f"The error was encountered in {repo}."
    if comment_string in issue.body:
        return True
    for comment in issue.get_comments():
        if comment_string in comment.body:
            return True
    return False


def _is_duplicate(stacktrace1, stacktrace2):
    """
    Checks whether the two stacktraces are duplicates based on Levenshtein distance between them
    """
    ld = pylev.levenshtein(stacktrace1, stacktrace2)
    ratio = max(ld / len(stacktrace1), ld / len(stacktrace2))
    return ratio < 0.1


def _find_duplicate(stacktrace):
    """
    Returns duplicate of stacktrace, if it exists. If not, it returns None
    """
    for issue in repo.get_issues(state="open"):
        body = issue.body.rsplit("Stacktrace:", 1)[-1]
        if _is_duplicate(stacktrace, body):
            return issue
    return None


def _report_body(repo, run, image, stacktrace):
    """
    Returns formatted report
    """
    return (
        f"The error was encountered in {repo}.\n\n"
        f"CI run: {run}\n\n"
        f"Image ID: {image}\n\n"
        f"Stacktrace:\n{stacktrace}\n"
    )


def _add_duplicate_comment(repo, run, image, stacktrace, issue):
    """
    Adds duplicate comment to issue
    """
    body = _report_body(repo, run, image, stacktrace)
    issue.create_comment(body)


def _create_issue(repo, run, image, stacktrace):
    """
    Creates a new issue with the error report
    """
    title = f"Error in {repo}"
    body = _report_body(repo, run, image, stacktrace)
    repo.create_issue(title, body)