import os
import pylev
import github
import logging

# Initialize logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s %(levelname)s: %(message)s')
stream_handler = logging.StreamHandler()
stream_handler.setFormatter(formatter)
logger.addHandler(stream_handler)

def _report_body(repo, run, image, stacktrace):
    return f"Repository: {repo}Run URL: {run}Image ID: {image}Stacktrace:{stacktrace}"

def _is_duplicate(st1, st2):
    # Calculate Levenshtein distance
    dist = pylev.levenshtein(st1, st2)
    
    # Calculate similarity ratio
    sim_ratio = 1 - (dist / max(len(st1), len(st2)))
    
    # Return True if similarity ratio is less than 0.1
    return sim_ratio < 0.1

def _find_duplicate(repo, stacktrace):
    gh = github.Github(os.environ['GITHUB_TOKEN'])
    
    # Get the target repo
    target_repo = gh.get_user().get_repo(os.environ['TAGBOT_ISSUES_REPO_NAME'])
    
    # Search for open issues
    for issue in target_repo.get_issues():
        
        # Skip if the issue was created by the bot
        if issue.user.login == 'JuliaTagBot':
            continue
            
        # Extract stacktrace from the issue body
        issue_stacktrace = issue.body.split("Stacktrace:")[1].strip()
        
        # Compare stacktraces
        if _is_duplicate(stacktrace, issue_stacktrace):
            return issue
            
    return None

def _already_commented(issue, repo):
    for comment in issue.get_comments():
        if comment.user.login == repo:
            return True
    return False

def _add_duplicate_comment(issue, repo, run, image, stacktrace):
    issue.create_comment(_report_body(repo, run, image, stacktrace))

def _create_issue(gh, repo, run, image, stacktrace):
    target_repo = gh.get_user().get_repo(os.environ['TAGBOT_ISSUES_REPO_NAME'])
    target_repo.create_issue(title=f"Error in {repo}", body=_report_body(repo, run, image, stacktrace))

def _handle_report(event, context):
    image = event['image']
    repo = event['repo']
    run = event['run']
    stacktrace = event['stacktrace']
    
    gh = github.Github(os.environ['GITHUB_TOKEN'])
    
    # Find a duplicate issue
    duplicate_issue = _find_duplicate(repo, stacktrace)
    
    if duplicate_issue is not None:
        # Add a comment to the duplicate issue
        if not _already_commented(duplicate_issue, repo):
            _add_duplicate_comment(duplicate_issue, repo, run, image, stacktrace)
    else:
        # Create a new issue
        _create_issue(gh, repo, run, image, stacktrace)

def handler(event, context):
    try:
        _handle_report(event, context)
    except Exception as e:
        logger.exception(e)