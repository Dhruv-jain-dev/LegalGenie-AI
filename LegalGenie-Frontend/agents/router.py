from __future__ import annotations


def route_request(prompt: str) -> str:
    """Return the specialised agent that best matches the user's intent."""
    text = prompt.lower()
    if any(term in text for term in ("summarize", "summary", "key points", "brief")):
        return "summary"
    if any(term in text for term in ("draft", "prepare", "write", "notice", "letter", "template")):
        return "draft"
    return "legal_qa"
