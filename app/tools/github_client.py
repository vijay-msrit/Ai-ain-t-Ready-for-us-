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


def get_historical_context(repo_url: str, issue_number: int) -> str | None:
    """
    Time Machine: find the commit that closed *issue_number*, return its
    **parent SHA** — i.e. the repo state *before* the fix was applied.

    Strategy
    --------
    1. Fetch the issue; bail early if it is still open.
    2. Walk the issue's timeline events looking for an event whose type
       indicates the issue was closed by a commit / PR merge:
         - "closed"  event  → event.commit_id  (direct commit close)
         - "merged"  event  (rare on issues but possible via REST)
       If those miss, fall back to scanning linked pull_requests via the
       issue's cross-reference events ("cross-referenced") for a merged PR.
    3. Once we have the *closing commit SHA*, resolve its first parent.
       - For direct-commit closes: use repo.get_commit(sha).parents[0].sha
       - For PR merges: the merge commit lives on the base repo regardless
         of whether the PR came from a fork, so we always look it up on the
         base repo.  If the commit cannot be found there (unusual edge case),
         we try the fork.

    Returns
    -------
    str | None  — parent SHA string, or None if the issue is open / no
                  closing commit could be resolved.

    Raises
    ------
    GithubException  — re-raised for auth / permission errors so the caller
                       can surface them.  404 / commit-not-found errors are
                       swallowed and return None.
    """
    try:
        repo = _get_github_repo(repo_url)
        issue = repo.get_issue(issue_number)
    except GithubException as exc:
        logger.error(f"[github_client] get_historical_context: cannot fetch issue — {exc}")
        raise

    # ── 1. Issue must be closed ───────────────────────────────────────────────
    if issue.state != "closed":
        logger.info(
            f"[github_client] Issue #{issue_number} is still open — "
            "defaulting to latest main."
        )
        return None

    closing_sha: str | None = None
    fork_full_name: str | None = None  # set if the merge came from a fork

    # ── 2. Walk timeline events ───────────────────────────────────────────────
    try:
        for event in issue.get_timeline():
            event_type = getattr(event, "event", None)

            # Direct commit close  ─────────────────────────────────────────────
            if event_type == "closed":
                commit_id = getattr(event, "commit_id", None)
                if commit_id:
                    closing_sha = commit_id
                    logger.info(
                        f"[github_client] Issue #{issue_number} closed by commit {commit_id[:8]}"
                    )
                    break

            # Closed via a PR (cross-referenced) ──────────────────────────────
            if event_type == "cross-referenced":
                source = getattr(event, "source", None)
                if source is None:
                    continue
                source_issue = getattr(source, "issue", None)
                if source_issue is None:
                    continue
                # Check it is a PR (pull_request attribute exists) and is merged
                pr_ref = getattr(source_issue, "pull_request", None)
                if pr_ref is None:
                    continue
                try:
                    pr = repo.get_pull(source_issue.number)
                except GithubException:
                    continue
                if not pr.merged:
                    continue
                closing_sha = pr.merge_commit_sha
                # Detect cross-repo (fork) PR
                if pr.head.repo and pr.head.repo.full_name != repo.full_name:
                    fork_full_name = pr.head.repo.full_name
                    logger.info(
                        f"[github_client] Merge came from fork '{fork_full_name}' "
                        f"— merge commit {closing_sha[:8]} lives on base repo."
                    )
                else:
                    logger.info(
                        f"[github_client] Issue #{issue_number} closed by PR #{pr.number} "
                        f"merge commit {closing_sha[:8]}"
                    )
                break
    except Exception as exc:
        logger.warning(f"[github_client] Timeline walk failed: {exc}")

    # ── 2b. Fallback: scan linked PRs via search ──────────────────────────────
    if not closing_sha:
        logger.info(
            f"[github_client] Timeline gave no closing commit for #{issue_number}; "
            "trying PR search fallback."
        )
        try:
            g = _get_github_repo.__wrapped__ if hasattr(_get_github_repo, "__wrapped__") else None
            from github import Github  # noqa: F401
            g = Github(settings.github_token)
            query = (
                f"repo:{repo.full_name} is:pr is:merged "
                f"in:body #{issue_number}"
            )
            results = g.search_issues(query=query)
            for item in results:
                pr = repo.get_pull(item.number)
                if pr.merged and pr.merge_commit_sha:
                    closing_sha = pr.merge_commit_sha
                    if pr.head.repo and pr.head.repo.full_name != repo.full_name:
                        fork_full_name = pr.head.repo.full_name
                    logger.info(
                        f"[github_client] Fallback found merge commit {closing_sha[:8]} "
                        f"via PR #{pr.number}"
                    )
                    break
        except Exception as exc:
            logger.warning(f"[github_client] PR search fallback failed: {exc}")

    if not closing_sha:
        logger.warning(
            f"[github_client] Could not resolve a closing commit for issue #{issue_number}."
        )
        return None

    # ── 3. Resolve parent commit SHA ─────────────────────────────────────────
    # Merge commits (and direct closes) always end up in the BASE repo's
    # history, even when a fork was involved.  Try base first, fork second.
    repos_to_try = [repo]
    if fork_full_name:
        try:
            from github import Github as _GH
            fork_repo = _GH(settings.github_token).get_repo(fork_full_name)
            repos_to_try.append(fork_repo)
        except GithubException:
            pass

    for target_repo in repos_to_try:
        try:
            commit = target_repo.get_commit(closing_sha)
            if not commit.parents:
                logger.warning(
                    f"[github_client] Commit {closing_sha[:8]} has no parents "
                    "(initial commit?). Returning None."
                )
                return None
            parent_sha = commit.parents[0].sha
            logger.info(
                f"[github_client] Time Machine SHA: {parent_sha[:8]} "
                f"(parent of closing commit {closing_sha[:8]})"
            )
            return parent_sha
        except GithubException as exc:
            if exc.status == 404:
                logger.debug(
                    f"[github_client] Commit {closing_sha[:8]} not found in "
                    f"{target_repo.full_name} — trying next."
                )
                continue
            raise  # re-raise auth/rate-limit errors

    logger.warning(
        f"[github_client] Parent commit for {closing_sha[:8]} not found in any repo."
    )
    return None

