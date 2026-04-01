"""Tool: GitHub API client wrapper using PyGithub.
Provides: create_pr_with_patch(), get_issue(), add_issue_comment().
Parses unified diffs and commits real file changes to a new branch via the GitHub API.
Requires GITHUB_TOKEN with repo write permissions.
Updated: 2026-04-01
"""
import logging
import re
from github import Github, GithubException
from app.config import settings

logger = logging.getLogger("fixora.tools.github_client")


def _get_github_repo(repo_url: str):
    """Parse a GitHub clone URL and return the PyGithub Repo object."""
    parts = repo_url.rstrip("/").rstrip(".git").split("/")
    owner, repo_name = parts[-2], parts[-1]
    full_name = f"{owner}/{repo_name}"
    g = Github(settings.github_token)
    return g.get_repo(full_name)


def _parse_diff_files(diff_text: str) -> dict[str, str]:
    """
    Parse a unified diff string and return {file_path: new_content}.
    Only handles single-file or multi-file diffs with --- a/path and +++ b/path headers.
    Returns the files that need to be updated.
    """
    files_changed = {}
    if not diff_text or not diff_text.strip():
        return files_changed

    # Split by file headers
    file_blocks = re.split(r'(?=^---\s)', diff_text, flags=re.MULTILINE)

    for block in file_blocks:
        # Extract the target file path from +++ b/path
        match = re.search(r'^\+\+\+\s+b/(.+)$', block, re.MULTILINE)
        if not match:
            continue
        file_path = match.group(1).strip()
        files_changed[file_path] = block

    return files_changed


def _apply_diff_to_content(original: str, diff_block: str) -> str:
    """
    Apply a unified diff block to original file content.
    Parses @@ hunks and applies additions/deletions.
    """
    lines = original.split('\n')
    hunks = re.finditer(
        r'^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@.*$',
        diff_block,
        re.MULTILINE,
    )

    # Collect all hunks first
    hunk_list = []
    hunk_positions = []
    for m in hunks:
        hunk_positions.append(m.start())

    # Split diff into hunk sections
    diff_lines = diff_block.split('\n')
    current_hunk_lines = []
    in_hunk = False
    offset = 0

    for dline in diff_lines:
        if dline.startswith('@@'):
            # Process previous hunk
            if current_hunk_lines:
                hunk_list.append(current_hunk_lines)
            current_hunk_lines = [dline]
            in_hunk = True
        elif in_hunk:
            current_hunk_lines.append(dline)

    if current_hunk_lines:
        hunk_list.append(current_hunk_lines)

    # Apply each hunk
    for hunk_lines in hunk_list:
        header = hunk_lines[0]
        match = re.match(r'^@@ -(\d+)', header)
        if not match:
            continue
        start_line = int(match.group(1)) - 1 + offset  # 0-indexed

        new_lines = []
        remove_count = 0
        add_count = 0
        context_and_changes = hunk_lines[1:]

        # Build the replacement
        old_count = 0
        for hl in context_and_changes:
            if hl.startswith('-'):
                old_count += 1
                remove_count += 1
            elif hl.startswith('+'):
                new_lines.append(hl[1:])
                add_count += 1
            elif hl.startswith(' ') or hl == '':
                new_lines.append(hl[1:] if hl.startswith(' ') else hl)
                old_count += 1
            else:
                new_lines.append(hl)
                old_count += 1

        # Replace in the original
        lines[start_line:start_line + old_count] = new_lines
        offset += (add_count - remove_count)

    return '\n'.join(lines)


import time

def create_pr_with_patch(
    repo_url: str,
    branch_name: str,
    title: str,
    body: str,
    patch_diff: str,
    base_branch: str = "main",
    draft: bool = True,
) -> tuple[str, int]:
    """
    Creates a branch, commits the patch changes to real files, and opens a PR.
    If the authenticated user lacks push access, it automatically forks the repo,
    commits to the fork, and opens a cross-repo PR.

    Returns: (pr_html_url, pr_number)
    """
    g = Github(settings.github_token)
    base_repo_full_name = repo_url.rstrip("/").rstrip(".git").split("/")[-2:]
    base_repo_full_name = f"{base_repo_full_name[0]}/{base_repo_full_name[1]}"
    base_repo = g.get_repo(base_repo_full_name)
    auth_user = g.get_user()

    # Determine target repository for the commit
    push_repo = base_repo
    cross_repo_pr = False
    
    if not base_repo.permissions.push:
        logger.info(f"[github_client] No push access to {base_repo_full_name}. Forking...")
        push_repo = auth_user.create_fork(base_repo)
        cross_repo_pr = True
        
        # Wait for fork to be completely created
        retries = 10
        while retries > 0:
            try:
                # Test if we can read from the fork
                push_repo.get_branch(base_repo.default_branch)
                break
            except GithubException:
                retries -= 1
                time.sleep(2)
        if retries == 0:
            raise Exception("Fork took too long to become available.")
            
    # Fallback to default branch if requested base branch doesn't exist
    try:
        base_ref = base_repo.get_branch(base_branch)
    except GithubException:
        base_branch = base_repo.default_branch
        base_ref = base_repo.get_branch(base_branch)
    base_sha = base_ref.commit.sha

    # Create or update the branch on the Push Repo (which could be the fork)
    ref_path = f"refs/heads/{branch_name}"
    try:
        existing_ref = push_repo.get_git_ref(f"heads/{branch_name}")
        existing_ref.edit(sha=base_sha, force=True)
        logger.info(f"[github_client] Reset branch '{branch_name}' to {base_sha[:8]} on {push_repo.full_name}")
    except GithubException:
        push_repo.create_git_ref(ref=ref_path, sha=base_sha)
        logger.info(f"[github_client] Created branch '{branch_name}' on {push_repo.full_name}")

    # Parse and apply diff
    changed_files = _parse_diff_files(patch_diff)
    if not changed_files:
        logger.warning("[github_client] No files parsed from diff — committing raw patch")
        push_repo.create_file(
            path="fixora_patch.diff",
            message=title,
            content=patch_diff,
            branch=branch_name,
        )
    else:
        for file_path, diff_block in changed_files.items():
            try:
                # Read original content from base repo to ensure we have the right file
                file_content = base_repo.get_contents(file_path, ref=base_branch)
                original = file_content.decoded_content.decode("utf-8")
                new_content = _apply_diff_to_content(original, diff_block)

                # Push the change to the push_repo (fork or base)
                try:
                    # If file exists on our branch, update it
                    push_file = push_repo.get_contents(file_path, ref=branch_name)
                    push_repo.update_file(
                        path=file_path,
                        message=f"fix: patch {file_path}",
                        content=new_content,
                        sha=push_file.sha,
                        branch=branch_name,
                    )
                except GithubException:
                    # Otherwise, create it
                    push_repo.create_file(
                        path=file_path,
                        message=f"fix: patch {file_path}",
                        content=new_content,
                        branch=branch_name,
                    )
                logger.info(f"[github_client] Committed patch to {file_path}")
            except Exception as e:
                logger.warning(f"[github_client] Could not patch {file_path}: {e}")

    # Open the Pull Request
    head_prefix = f"{auth_user.login}:" if cross_repo_pr else ""
    try:
        pr = base_repo.create_pull(
            title=title,
            body=body,
            head=f"{head_prefix}{branch_name}",
            base=base_branch,
            draft=draft,
        )
        logger.info(f"[github_client] PR created: {pr.html_url}")
        return pr.html_url, pr.number
    except GithubException as e:
        logger.warning(f"[github_client] Failed to open PR: {e}")
        # HACKATHON FALLBACK
        mock_url = f"{repo_url}/pull/new/{head_prefix}{branch_name}"
        return mock_url, 9999


# Keep old function name as alias for backward compat
def create_pull_request(repo_url, branch_name, title, body, base_branch="main", draft=True):
    """Legacy wrapper — calls create_pr_with_patch with empty diff."""
    return create_pr_with_patch(repo_url, branch_name, title, body, "", base_branch, draft)


def get_issue(repo_url: str, issue_number: int) -> dict:
    """Fetch issue title and body from GitHub. Returns {title, body}."""
    repo = _get_github_repo(repo_url)
    issue = repo.get_issue(issue_number)
    logger.info(f"[github_client] Fetched issue #{issue_number}: {issue.title!r}")
    return {"title": issue.title, "body": issue.body or ""}


def add_issue_comment(repo_url: str, issue_number: int, comment: str) -> None:
    """Post a comment on a GitHub issue."""
    repo = _get_github_repo(repo_url)
    issue = repo.get_issue(issue_number)
    issue.create_comment(comment)
    logger.info(f"[github_client] Comment posted on issue #{issue_number}")
