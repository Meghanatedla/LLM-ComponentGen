import os
from typing import Any
import pylev
import github

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
TAGBOT_ISSUES_REPO_NAME = os.getenv("TAGBOT_ISSUES_REPO_NAME")

gh = github.Github(GITHUB_TOKEN)
TAGBOT_ISSUES_REPO = gh.get_repo(TAGBOT_ISSUES_REPO_NAME)

DUPLICATE_THRESHOLD = 0.1

class Logger:
    def log(self, msg):
        print(msg)

logger = Logger()
def handler(event: dict[str, Any], context: Any) -> None:
    _handle_report(event["image"], event["repo"], event["run"], event["stacktrace"])

def _handle_report(image: str, repo: str, run: str, stacktrace: str) -> None:
    duplicate_issue = _find_duplicate(stacktrace)
    if duplicate_issue is not None and not _already_commented(duplicate_issue, repo):
        _add_duplicate_comment(duplicate_issue, image, repo, run, stacktrace)
    else:
        _create_issue(image, repo, run, stacktrace)

def _already_commented(issue: github.Issue.Issue, repo: str) -> bool:
    return any(c.body.startswith(f"@{repo} ") for c in issue.get_comments())

def _is_duplicate(st1: str, st2: str) -> bool:
    return pylev.levenshtein(st1, st2) / max(len(st1), len(st2)) <= DUPLICATE_THRESHOLD

def _find_duplicate(stacktrace: str) -> github.Issue.Issue:
    for issue in TAGBOT_ISSUES_REPO.get_issues():
        for comment in issue.get_comments():
            if _is_duplicate(comment.body, stacktrace):
                return issue
    return None

def _report_body(image: str, repo: str, run: str, stacktrace: str) -> str:
    return f"""
Image ID: {image}
Repository: {repo}
Run URL: {run}
Stacktrace:
```
{stacktrace}
```
"""

def _add_duplicate_comment(issue: github.Issue.Issue, image: str, repo: str, run: str, stacktrace: str) -> None:
    issue.create_comment(_report_body(image, repo, run, stacktrace))

def _create_issue(image: str, repo: str, run: str, stacktrace: str) -> None:
    TAGBOT_ISSUES_REPO.create_issue(f"Error report in {repo}", _report_body(image, repo, run, stacktrace))