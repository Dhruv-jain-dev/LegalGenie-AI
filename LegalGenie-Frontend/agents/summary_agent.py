from __future__ import annotations

from .legal_agent import DISCLAIMER, _complete


def summarize(text: str) -> str:
    result = _complete(
        "You summarize legal documents in plain English. Give: purpose, parties, key obligations, dates/amounts, risks, and questions to ask a lawyer. Do not give legal advice.",
        f"Summarize this document:\n\n{text[:30000]}",
    )
    return result + DISCLAIMER
