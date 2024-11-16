import os
import logging
import github
import pylev

def handler(event, context):
    image = event.get('image')
    repo = event.get('repo')
    run = event.get('run')
    stacktrace = event.get('stacktrace')

    _handle_report(image, repo, run, stacktrace)
    
def _handle_report(image, repo, run, stacktrace):
    logger = logging.getLogger()
    
    duplicate_issue, duplicate_comment = _find_duplicate(repo, stacktrace)
    
    if duplicate_issue:
        if not _already_commented(duplicate_issue, repo):
            _add_duplicate_comment(duplicate_issue, repo, run, stacktrace)
    else:
        _create_issue(repo, run, stacktrace)

def _already_commented(issue, repo):
    for comment in issue.get_comments():
        if repo in comment.body:
            return True
    return False

def _is_duplicate(stacktrace1, stacktrace2):
    distance = pylev.levenshtein(stacktrace1, stacktrace2)
    stacktrace_length = max(len(stacktrace1), len(stacktrace2))
    similarity_ratio = distance / stacktrace_length
    return similarity_ratio < 0.1

def _find_duplicate(repo, stacktrace):
    github_token = os.getenv('GITHUB_TOKEN')
    issues_repo_name = os.getenv('TAGBOT_ISSUES_REPO_NAME')
    
    gh = github.Github(github_token)
    repo = gh.get_repo(issues_repo_name)
    
    for issue in repo.get_issues():
        existing_stacktrace = issue.body
        if _is_duplicate(existing_stacktrace, stacktrace):
            return issue, True
    
    return None, False

def _report_body(image, repo, run, stacktrace):
    return f"Image ID: {image}\nRepository: {repo}\nCI Run URL: {run}\n\nStacktrace:\n{stacktrace}"

def _add_duplicate_comment(issue, repo, run, stacktrace):
    comment_body = f"Possible duplicate error report from {repo}.\n\n{_report_body(issue, repo, run, stacktrace)}"
    issue.create_comment(comment_body)

def _create_issue(repo, run, stacktrace):
    github_token = os.getenv('GITHUB_TOKEN')
    issues_repo_name = os.getenv('TAGBOT_ISSUES_REPO_NAME')
    
    gh = github.Github(github_token)
    repo = gh.get_repo(issues_repo_name)
    
    issue_title = f"Error Report - {repo}"
    issue_body = _report_body(repo, run, stacktrace)
    
    repo.create_issue(title=issue_title, body=issue_body)