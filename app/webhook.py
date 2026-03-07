"""
GitHub Webhook receiver.

Validates the HMAC-SHA256 signature from GitHub, extracts the issue event,
and kicks off the Fixora LangGraph pipeline asynchronously.
"""
import hashlib
import hmac
import json
import logging
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Request

from app.config import settings
from app.graph import run_pipeline

logger = logging.getLogger("fixora.webhook")
router = APIRouter()


def _verify_signature(body: bytes, signature: str) -> bool:
    """Verify GitHub's HMAC-SHA256 webhook signature."""
    if not settings.github_webhook_secret:
        logger.warning("GITHUB_WEBHOOK_SECRET not set — skipping signature verification.")
        return True
    expected = "sha256=" + hmac.new(
        settings.github_webhook_secret.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


@router.post("/github")
async def github_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_hub_signature_256: Annotated[str, Header()] = "",
    x_github_event: Annotated[str, Header()] = "",
):
    """
    Entry point for GitHub webhook events.
    Only processes 'issues' events with action 'opened' or 'reopened'.
    """
    body = await request.body()

    if not _verify_signature(body, x_hub_signature_256):
        raise HTTPException(status_code=401, detail="Invalid webhook signature.")

    if x_github_event != "issues":
        logger.info(f"Ignoring GitHub event: {x_github_event}")
        return {"status": "ignored", "reason": f"event '{x_github_event}' not handled"}

    payload: dict = json.loads(body)
    action = payload.get("action", "")

    if action not in ("opened", "reopened"):
        return {"status": "ignored", "reason": f"action '{action}' not handled"}

    issue = payload.get("issue", {})
    repo = payload.get("repository", {})
    repo_url = repo.get("clone_url", "")
    issue_number = issue.get("number")

    logger.info(f"Processing issue #{issue_number} from {repo_url}")

    initial_state = {
        "repo_url": repo_url,
        "issue_event": payload,
        "issue_number": issue_number,
        "issue_title": issue.get("title", ""),
        "issue_body": issue.get("body", ""),
        "current_phase": "start",
        "indexed": False,
    }

    background_tasks.add_task(run_pipeline, initial_state)

    return {
        "status": "accepted",
        "issue_number": issue_number,
        "repo": repo.get("full_name"),
    }


@router.post("/trigger")
async def manual_trigger(payload: dict, background_tasks: BackgroundTasks):
    """
    Manual trigger endpoint for testing without a live GitHub webhook.
    POST body: { "repo_url": "...", "issue_number": 1, "issue_title": "...", "issue_body": "..." }
    """
    logger.info(f"Manual trigger received: {payload}")
    initial_state = {
        "repo_url": payload.get("repo_url", ""),
        "issue_event": payload,
        "issue_number": payload.get("issue_number", 0),
        "issue_title": payload.get("issue_title", ""),
        "issue_body": payload.get("issue_body", ""),
        "current_phase": "start",
        "indexed": False,
    }
    background_tasks.add_task(run_pipeline, initial_state)
    return {"status": "accepted", "payload": payload}
