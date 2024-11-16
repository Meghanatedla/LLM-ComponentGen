import os
import pylev
import github
from github import InputGitAuthor

# Authenticate with GitHub API
gh = github.Github(os.environ['GITHUB_TOKEN'])

def _is_duplicate(stacktrace1, stacktrace2):
    # Calculate Levenshtein distance between two stacktraces
    distance = pylev.levenshtein(stacktrace1, stacktrace2)
    # Compare against length of shorter stacktrace for normalization
    return distance / min(len(stacktrace1), len(stacktrace2)) < 0.1

def _find_duplicate(repository, stacktrace):
    # Get all open issues in the repository
    for issue in repository.get_issues():
        # Skip if issue does not contain a stacktrace
        if'stacktrace' not in issue.title:
            continue
        
        # Extract stacktrace from issue title
        issue_stacktrace = issue.title.split(':')[1].strip()

        # Check if stacktraces are duplicates
        if _is_duplicate(stacktrace, issue_stacktrace):
            return issue
    
    # No duplicates found
    return None

def _add_duplicate_comment(issue, repo_name, run_url, image_id, stacktrace):
    # Format error report
    report = f"Repository: {repo_name}Run URL: {run_url}Image ID: {image_id}Stacktrace: {stacktrace}"
    # Add comment to issue
    issue.create_comment(f"@{repo_name} Duplicate Error Report Found! {report}")

def _create_issue(repository, repo_name, run_url, image_id, stacktrace):
    # Format error report
    report = f"Repository: {repo_name}Run URL: {run_url}Image ID: {image_id}Stacktrace: {stacktrace}"
    # Create new issue
    repository.create_issue(title=f"Error Report: {repo_name}", body=report)

def _already_commented(issue, repo_name):
    # Search for previous comments from repo
    for comment in issue.get_comments():
        if comment.user.login == repo_name:
            return True
    return False

def _handle_report(repo_name, run_url, image_id, stacktrace):
    # Get repository
    repository = gh.get_repo(repo_name)

    # Find duplicate issue
    duplicate_issue = _find_duplicate(repository, stacktrace)

    # If duplicate found and not commented before, add comment
    if duplicate_issue and not _already_commented(duplicate_issue, repo_name):
        _add_duplicate_comment(duplicate_issue, repo_name, run_url, image_id, stacktrace)
    else:  # Otherwise, create new issue
        _create_issue(repository, repo_name, run_url, image_id, stacktrace)

def handler(event, context):
    # Extract required fields from event
    repo_name = event['repo']
    run_url = event['run']
    image_id = event['image']
    stacktrace = event['stacktrace']
    _handle_report(repo_name, run_url, image_id, stacktrace)