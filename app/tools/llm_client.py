"""Tool: LLM client factory — supports OpenAI, DeepSeek, and Groq.
get_llm_client() is @lru_cache'd — same instance reused across all agents.
groq_chat() uses the native Groq SDK with reasoning_effort='medium'.
Updated: 2026-04-01
"""
import logging
from functools import lru_cache
from typing import Union

from langchain_openai import ChatOpenAI

from app.config import settings

logger = logging.getLogger("fixora.tools.llm_client")


# ---------------------------------------------------------------------------
# Native Groq client (used for direct streaming / reasoning_effort support)
# ---------------------------------------------------------------------------

def get_groq_client():
    """Return a raw Groq SDK client for streaming calls."""
    try:
        from groq import Groq
    except ImportError as e:
        raise ImportError(
            "groq package not installed. Run: pip install groq"
        ) from e

    return Groq(api_key=settings.groq_api_key)


def groq_chat(prompt: str, stream: bool = False) -> str:
    """
    Send a single user message to Groq and return the response text.
    Uses model=openai/gpt-oss-120b with reasoning_effort='medium'.
    """
    client = get_groq_client()
    completion = client.chat.completions.create(
        model=settings.llm_model,         # e.g. "openai/gpt-oss-120b"
        messages=[{"role": "user", "content": prompt}],
        temperature=1,
        max_completion_tokens=8192,
        top_p=1,
        reasoning_effort="medium",
        stream=stream,
        stop=None,
    )

    if stream:
        result = ""
        for chunk in completion:
            delta = chunk.choices[0].delta.content or ""
            print(delta, end="", flush=True)
            result += delta
        return result
    else:
        return completion.choices[0].message.content or ""


# ---------------------------------------------------------------------------
# LangChain client (used by LangGraph agents for OpenAI / DeepSeek / Groq)
# ---------------------------------------------------------------------------

def get_llm_client(temperature: float = 0.1) -> ChatOpenAI:
    """
    Return a cached LangChain ChatOpenAI-compatible client.

    - LLM_PROVIDER=groq      → Groq API (OpenAI-compatible endpoint)
    - LLM_PROVIDER=deepseek  → DeepSeek API
    - LLM_PROVIDER=openai    → OpenAI API
    """
    kwargs = dict(
        model=settings.llm_model,
        api_key=settings.effective_api_key,
        temperature=temperature,
        max_retries=3,
    )
    if settings.effective_base_url:
        kwargs["base_url"] = settings.effective_base_url

    logger.info(
        f"[llm_client] Provider: {settings.llm_provider.upper()} | "
        f"Model: {settings.llm_model} | "
        f"Base URL: {settings.effective_base_url or 'default'}"
    )
    return ChatOpenAI(**kwargs)
