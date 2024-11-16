import os
import github
import pylev
import boto3
from botocore.exceptions import BotoCoreError

# Assuming the environment variables are set appropriately
GITHUB_TOKEN = os.environ['GITHUB_TOKEN']
TAGBOT_ISSUES_REPO_NAME = os.environ['TAGBOT_ISSUES_REPO_NAME']

gh = github.Github(GITHUB_TOKEN)
issues_repo = gh.get_user().get_repo(TAGBOT_ISSUES_REPO_NAME)

def _is_duplicate(stacktrace1, stacktrace2):
    # Calculate Levenshtein distance between two stacktraces
    return pylev.levenshtein(stacktrace1, stacktrace2) / max(len(stacktrace1), len(stacktrace2)) < 0.1

def _find_duplicate(stacktrace, repo):
    # Search for a duplicate issue
    for issue in repo.get_issues():
        if issue.title == f"Duplicate Error Report: {repo.name}":
            continue
        if _is_duplicate(issue.body.split('')[-1], stacktrace):
            return issue
    return None

def _add_duplicate_comment(issue, stacktrace):
    # Add a comment to an existing issue
    issue.create_comment("Possible duplicate of previous error report:Stacktrace:```{}```".format(stacktrace))

def _create_issue(repo, run_url, image_id, stacktrace):
    # Create a new issue
    repo.create_issue(title=f"New Error Report: {repo.name}", body="Run URL: {}Image ID: {}Stacktrace:```{}```".format(run_url, image_id, stacktrace))

def _already_commented(issue, repo_name):
    # Check if the issue has already been commented on
    for comment in issue.get_comments():
        if repo_name in comment.body:
            return True
    return False

def _handle_report(event, context):
    # Main function to handle the error report
    repo_name = event['repo']
    run_url = event['run']
    image_id = event['image']
    stacktrace = event['stacktrace']
    
    repo = gh.get_user().get_repo(repo_name)
    duplicate_issue = _find_duplicate(stacktrace, repo)
    
    if duplicate_issue and not _already_commented(duplicate_issue, repo_name):
        _add_duplicate_comment(duplicate_issue, stacktrace)
    else:
        _create_issue(repo, run_url, image_id, stacktrace)
        
def handler(event, context):
    # Entry point for AWS Lambda
    try:
        _handle_report(event, context)
    except Exception as e:
        print(e)
        raise e