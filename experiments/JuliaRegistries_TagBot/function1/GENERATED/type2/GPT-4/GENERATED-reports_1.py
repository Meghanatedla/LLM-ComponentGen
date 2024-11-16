import os
import logging
import github
from pylev import leven

GITHUB_TOKEN = os.environ['GITHUB_TOKEN']
TAGBOT_ISSUES_REPO_NAME = os.getenv('TAGBOT_ISSUES_REPO_NAME', 'JuliaLang/julia')

gh = github.Github(GITHUB_TOKEN)
repo = gh.get_repo(TAGBOT_ISSUES_REPO_NAME)
logger = logging.getLogger()


def handler(event, context):
    image = event.get('image', '')
    repo_name = event.get('repo', '')
    run_url = event.get('run', '')
    stacktrace = event.get('stacktrace', '')
    _handle_report(image, repo_name, run_url, stacktrace)


def _handle_report(image, repo_name, run_url, stacktrace):
    report_body = _report_body(repo_name, run_url, image, stacktrace)
    issue = _find_duplicate(stacktrace)
    if issue and not _already_commented(issue, repo_name):
        _add_duplicate_comment(issue, report_body)
    else:
        _create_issue(repo_name, report_body)


def _already_commented(issue, repo_name):
    for comment in issue.get_comments():
        if repo_name in comment.body:
            return True
    return False


def _is_duplicate(stacktrace1, stacktrace2):
    leven_sim_ratio = leven(stacktrace1, stacktrace2) / max(len(stacktrace1), len(stacktrace2))
    return leven_sim_ratio < 0.1


def _find_duplicate(stacktrace):
    for issue in repo.get_issues(state='open'):
        if _is_duplicate(issue.body, stacktrace):
            return issue
    return None


def _report_body(repo, run_url, image, stacktrace):
    return f'Repo: {repo}\nRun: {run_url}\nImage: {image}\nStack: ```\n{stacktrace}\n```'


def _add_duplicate_comment(issue, body):
    issue.create_comment(body)
    logger.info(f'Added duplicate comment to issue #{issue.number}')


def _create_issue(repo, body):
    title = f'[AUTOMATED] {repo} error'
    issue = repo.create_issue(title, body=body)
    logger.info(f'Created new issue #{issue.number} for repo {repo}')