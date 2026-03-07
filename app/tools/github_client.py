"""Tool: GitHub API client wrapper using PyGithub."""
import logging
from github import Github, GithubException
from app.config import settings

logger = logging.getLogger("fixora.tools.github_client")


def _get_github_repo(repo_url: str):
    """Parse a GitHub clone URL and return the PyGithub Repo object."""
    # e.g. https://github.com/owner/repo.git → owner/repo
    parts = repo_url.rstrip("/").rstrip(".git").split("/")
    owner, repo_name = parts[-2], parts[-1]
    full_name = f"{owner}/{repo_name}"
    g = Github(settings.github_token)
    return g.get_repo(full_name)


def create_pull_request(
    repo_url: str,
    branch_name: str,
    title: str,
    body: str,
    base_branch: str = "main",
    draft: bool = True,
) -> tuple[str, int]:
    """
    Creates a GitHub Pull Request from branch_name into base_branch.

    Note: The patch must already have been committed and pushed to branch_name
    before calling this function.

    Returns:
        (pr_html_url, pr_number)
    """
    repo = _get_github_repo(repo_url)

    # Verify head branch exists; create it from base if not
    try:
        repo.get_branch(branch_name)
        logger.info(f"[github_client] Branch '{branch_name}' exists.")
    except GithubException:
        logger.info(f"[github_client] Creating branch '{branch_name}' from '{base_branch}'.")
        base_sha = repo.get_branch(base_branch).commit.sha
        repo.create_git_ref(ref=f"refs/heads/{branch_name}", sha=base_sha)

    pr = repo.create_pull(
        title=title,
        body=body,
        head=branch_name,
        base=base_branch,
        draft=draft,
    )
    logger.info(f"[github_client] PR created: {pr.html_url}")
    return pr.html_url, pr.number


def add_issue_comment(repo_url: str, issue_number: int, comment: str) -> None:
    """Post a comment on a GitHub issue (e.g. to notify of processing start)."""
    repo = _get_github_repo(repo_url)
    issue = repo.get_issue(issue_number)
    issue.create_comment(comment)
    logger.info(f"[github_client] Comment posted on issue #{issue_number}")
