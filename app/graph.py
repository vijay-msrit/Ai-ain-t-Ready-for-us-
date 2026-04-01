"""
LangGraph StateGraph — wires all Fixora agents into a single pipeline.
Pipeline flow: parse → locate → patch → evaluate
Each step performs an error-check; aborts early if an error is set in state.
Updated: 2026-04-01
"""
import logging
from langgraph.graph import StateGraph, END

from app.state import FixoraState
from app.agents.indexer import indexer_node
from app.agents.issue_processor import issue_processor_node
from app.agents.localizer import localizer_node
from app.agents.patcher import patcher_node
from app.agents.evaluator import evaluator_node

logger = logging.getLogger("fixora.graph")


def _should_abort(state: FixoraState) -> str:
    """Route to END if any agent set an error."""
    if state.get("error"):
        logger.error(f"Pipeline aborted at phase '{state.get('current_phase')}': {state['error']}")
        return "end"
    return "continue"


def build_graph() -> StateGraph:
    graph = StateGraph(FixoraState)

    # Register nodes
    graph.add_node("index",    indexer_node)
    graph.add_node("parse",    issue_processor_node)
    graph.add_node("locate",   localizer_node)
    graph.add_node("patch",    patcher_node)
    graph.add_node("evaluate", evaluator_node)

    # Entry point
    graph.set_entry_point("parse")

    # Linear pipeline with error-check branches
    for src, dst in [
        ("parse",    "locate"),
        ("locate",   "patch"),
        ("patch",    "evaluate"),
    ]:
        graph.add_conditional_edges(
            src,
            _should_abort,
            {"continue": dst, "end": END},
        )

    graph.add_edge("evaluate", END)

    return graph.compile()


_compiled_graph = build_graph()


async def run_pipeline(initial_state: dict) -> FixoraState:
    """Run the full Fixora pipeline given an initial state dict."""
    logger.info(f"Starting pipeline for repo: {initial_state.get('repo_url')} "
                f"issue #{initial_state.get('issue_number')}")
    try:
        final_state = await _compiled_graph.ainvoke(initial_state)
        if final_state.get("pr_url"):
            logger.info(f"✅ PR created: {final_state['pr_url']}")
        else:
            logger.warning(f"Pipeline ended without creating a PR. "
                           f"Error: {final_state.get('error', 'unknown')}")
        return final_state
    except Exception as exc:
        logger.exception(f"Unhandled pipeline error: {exc}")
        return {**initial_state, "error": str(exc)}
