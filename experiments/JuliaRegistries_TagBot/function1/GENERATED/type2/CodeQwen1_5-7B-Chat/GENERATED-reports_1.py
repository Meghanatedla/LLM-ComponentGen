import os
import json
import logging
import github

logger = logging.getLogger(__name__)

TAGBOT_ISSUES_REPO_NAME = os.getenv('TAGBOT_ISSUES_REPO_NAME')
GITHUB_TOKEN = os.getenv('GITHUB_TOKEN')

def handler(event, context):
    image = event.get('image')
    repo = event.get('repo')
    run = event.get('run')
    stacktrace = event.get('stacktrace')

    if image and repo and run and stacktrace:
        _handle_report(image, repo, run, stacktrace)
    else:
        logger.error('Invalid event: missing required keys')

def _handle_report(image, repo, run, stacktrace):
    if _already_commented(repo):
        return
    
    if _is_duplicate(_find_duplicate(repo), stacktrace):
        _add_duplicate_comment(image, repo)
    else:
        _create_issue(image, repo, run, stacktrace)

def _already_commented(repo):
    gh = github.Github(GITHUB_TOKEN)
    repo_obj = gh.get_repo(repo)
    issues = repo_obj.get_issues()

    for issue in issues:
        if _report_body in issue.body:
            return True

    return False

def _is_duplicate(existing_stacktraces, incoming_stacktrace):
    similarity_ratio = 0.1
    max_len = max(len(existing_stacktraces), len(incoming_stacktrace))
    
    for existing in existing_stacktraces:
        distance = levenshtein_distance(existing, incoming_stacktrace)
        ratio = distance / max_len
        if ratio < similarity_ratio:
            return True

    return False

def _find_duplicate(repo):
    gh = github.Github(GITHUB_TOKEN)
    repo_obj = gh.get_repo(repo)
    issues = repo_obj.get_issues()

    existing_stacktraces = [issue.body for issue in issues]
    return existing_stacktraces

def _report_body(image, repo, run, stacktrace):
    return f"New error report from {repo}\nRun URL: {run}\nImage ID: {image}\nStacktrace:\n{stacktrace}"

def _add_duplicate_comment(image, repo):
    gh = github.Github(GITHUB_TOKEN)
    repo_obj = gh.get_repo(repo)
    last_issue = repo_obj.get_issues().reversed[0]
    last_issue.create_comment(f"Duplicate error report detected with similar stacktrace")

def _create_issue(image, repo, run, stacktrace):
    gh = github.Github(GITHUB_TOKEN)
    repo_obj = gh.get_repo(TAGBOT_ISSUES_REPO_NAME)
    repo_obj.create_issue(title=f"Error report from {repo}", body=_report_body(image, repo, run, stacktrace))

def levenshtein_distance(s1, s2):
    if len(s1) > len(s2):
        s1, s2 = s2, s1
    distances = range(len(s1) + 1)
    for i2, c2 in enumerate(s2):
        distances_ = [i2+1]
        for i1, c1 in enumerate(s1):
            if c1 == c2:
                distances_.append(distances[i1])
            else:
                distances_.append(1 + min((distances[i1], distances[i1 + 1], distances_[-1])))
        distances = distances_
    return distances[-1]