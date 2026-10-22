from __future__ import annotations

from .legal_agent import DISCLAIMER, _complete


def create_draft(request: str, context: list[str]) -> str:
    result = _complete(
        "Create a clearly labelled, general-purpose legal-document draft from the user's request. Use placeholders such as [NAME] for missing facts. Include no invented facts and add a short note that it needs review by a qualified lawyer.",
        f"Request: {request}\n\nRelevant document excerpts:\n{' '.join(context)}",
    )
    return result + DISCLAIMER
