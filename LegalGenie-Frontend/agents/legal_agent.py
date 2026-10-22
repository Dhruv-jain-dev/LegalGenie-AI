from __future__ import annotations

import os
import time
import logging

from google import genai
from google.genai import types

DISCLAIMER = "\n\n*General information only — not legal advice. Consult a qualified lawyer for advice on your situation.*"
logger = logging.getLogger(__name__)


class AIProviderError(RuntimeError):
    """A safe, user-facing failure from the configured Gemini provider."""

    def __init__(self, message: str, *, stage: str = "gemini_generate_content", provider_status: int | None = None, category: str = "unknown", http_status: int = 503) -> None:
        super().__init__(message)
        self.stage = stage
        self.provider_status = provider_status
        self.category = category
        self.http_status = http_status


def _provider_status(error: Exception) -> int | None:
    value = getattr(error, "status_code", None) or getattr(error, "code", None)
    return value if isinstance(value, int) else None


def _failure_details(error: Exception, model: str) -> tuple[str, int, str]:
    provider_status = _provider_status(error)
    if "getaddrinfo" in str(error).lower():
        return ("Gemini's hostname could not be resolved by the Python runtime. Configure DNS for the backend process, then restart the API.", 503, "dns_resolution")
    if provider_status in {401, 403}:
        return ("Gemini credentials were rejected. Ask an administrator to verify the Gemini API key and project permissions.", 502, "authentication_or_permission")
    if provider_status == 404:
        return (f"The configured Gemini model '{model}' is unavailable to this API key. Ask an administrator to select an available model.", 502, "model_unavailable")
    if provider_status == 429:
        return ("Gemini is rate-limited or out of quota. Please try again later.", 429, "rate_limit_or_quota")
    if provider_status and provider_status >= 500:
        return ("Gemini is temporarily unavailable. Please try again shortly.", 503, "provider_unavailable")
    return ("Gemini could not be reached. Check backend DNS, firewall, proxy, and outbound HTTPS access to Google AI services.", 503, "network_or_sdk")


def _is_transient_provider_error(error: Exception) -> bool:
    status_code = getattr(error, "status_code", None) or getattr(error, "code", None)
    if status_code in {429, 500, 502, 503, 504}:
        return True
    message = str(error).lower()
    return any(marker in message for marker in (" 429", " 500", " 502", " 503", " 504", "unavailable", "resource exhausted"))


def _complete(instructions: str, prompt: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("Gemini generation failed stage=config exception_type=MissingConfiguration provider_status=None category=configuration message=GEMINI_API_KEY is not configured")
        raise AIProviderError("AI generation is unavailable because Gemini is not configured.", stage="config", category="configuration")
    client = genai.Client(api_key=api_key)
    model = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(system_instruction=instructions),
            )
            if not response.text:
                raise AIProviderError("Gemini returned an empty response. Please try again.", category="empty_response")
            return response.text
        except AIProviderError:
            raise
        except Exception as error:
            if _is_transient_provider_error(error) and attempt < 2:
                time.sleep(0.5 * (2**attempt))
                continue
            message, http_status, category = _failure_details(error, model)
            logger.warning(
                "Gemini generation failed stage=gemini_generate_content exception_type=%s provider_status=%s category=%s model=%s message=%s",
                type(error).__name__,
                _provider_status(error),
                category,
                model,
                "Gemini request failed",
            )
            raise AIProviderError(message, provider_status=_provider_status(error), category=category, http_status=http_status) from error


def answer_question(question: str, context: list[str], conversation_history: list[dict[str, str]] | None = None) -> str:
    sources = "\n\n---\n\n".join(context) or "No uploaded-document context was retrieved."
    history = "\n".join(f"{message['role'].title()}: {message['content']}" for message in (conversation_history or [])) or "No earlier conversation."
    answer = _complete(
        "You are LegalGenie, a careful legal-information assistant. Use only the supplied document excerpts when answering about an uploaded document. State uncertainty clearly. Never claim to be a lawyer or provide legal advice.",
        f"Document excerpts:\n{sources}\n\nRecent conversation:\n{history}\n\nCurrent question: {question}",
    )
    return answer + DISCLAIMER
