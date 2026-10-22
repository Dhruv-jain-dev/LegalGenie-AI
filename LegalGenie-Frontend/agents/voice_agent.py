from __future__ import annotations

import os
import logging
import json
import re
from pathlib import Path

from elevenlabs.client import ElevenLabs

from agents.legal_agent import answer_question

logger = logging.getLogger(__name__)

MIME_EXTENSIONS = {
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/opus": "opus",
    "audio/mp4": "mp4",
    "audio/aac": "aac",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/flac": "flac",
    "audio/x-flac": "flac",
    "audio/x-m4a": "m4a",
}


def audio_container_metadata(audio_bytes: bytes) -> tuple[str, str]:
    """Return only container identification data; never inspect or log audio samples."""
    signature = audio_bytes[:16].hex()
    if audio_bytes.startswith(b"\x1aE\xdf\xa3"):
        return "webm", signature  # EBML/WebM
    if audio_bytes.startswith(b"OggS"):
        return "ogg", signature
    if len(audio_bytes) >= 8 and audio_bytes[4:8] == b"ftyp":
        return "mp4", signature
    if len(audio_bytes) >= 12 and audio_bytes[:4] == b"RIFF" and audio_bytes[8:12] == b"WAVE":
        return "wav", signature
    if audio_bytes.startswith(b"fLaC"):
        return "flac", signature
    if audio_bytes.startswith(b"ID3") or (len(audio_bytes) >= 2 and audio_bytes[0] == 0xFF and audio_bytes[1] & 0xE0 == 0xE0):
        return "mpeg_or_aac", signature
    return "unknown", signature


class VoiceTranscriptionError(RuntimeError):
    """A safe failure while using the configured ElevenLabs transcription service."""

    def __init__(self, message: str, *, stage: str, provider_status: int | None = None, category: str, http_status: int = 503) -> None:
        super().__init__(message)
        self.stage = stage
        self.provider_status = provider_status
        self.category = category
        self.http_status = http_status


def _provider_status(error: Exception) -> int | None:
    value = getattr(error, "status_code", None) or getattr(getattr(error, "response", None), "status_code", None)
    return value if isinstance(value, int) else None


def _failure_details(error: Exception) -> tuple[str, int, str]:
    """Classify SDK/HTTP failures without retaining provider bodies or headers."""
    provider_status = _provider_status(error)
    if provider_status in {400, 415, 422}:
        detail = _sanitize_provider_message(error)
        return (f"ElevenLabs rejected this recording: {detail}", 422, "invalid_audio")
    if provider_status == 413:
        return ("The recording is too large. Record a shorter question and try again.", 413, "audio_too_large")
    if provider_status in {401, 403}:
        return ("Voice transcription credentials were rejected. Ask an administrator to verify the ElevenLabs API key.", 502, "authentication")
    if provider_status == 429:
        return ("Voice transcription is rate-limited or out of quota. Please try again later.", 429, "rate_limit_or_quota")
    if provider_status and provider_status >= 500:
        return ("ElevenLabs transcription is temporarily unavailable. Please try again shortly.", 503, "provider_unavailable")
    return ("Voice transcription could not reach ElevenLabs. Check the backend network connection and try again.", 503, "network_or_sdk")


def _sanitize_provider_message(error: Exception) -> str:
    """Keep a short provider diagnostic without logging headers, secrets, or audio."""
    body = getattr(error, "body", None)
    if isinstance(body, str):
        try:
            body = json.loads(body)
        except json.JSONDecodeError:
            body = None
    if isinstance(body, dict):
        message = _message_from_provider_body(body) or "ElevenLabs returned an error response"
    else:
        message = "ElevenLabs request failed"
    message = re.sub(r"(?i)(authorization|xi-api-key|bearer)\s*[:=]?\s*\S+", r"\1=[redacted]", message)
    return " ".join(message.split())[:240]


def _message_from_provider_body(body: dict[object, object]) -> str | None:
    for key in ("message", "detail", "error"):
        value = body.get(key)
        if isinstance(value, str):
            return value
        if isinstance(value, dict):
            nested = _message_from_provider_body(value)
            if nested:
                return nested
    return None


def scribe_upload_file(audio_bytes: bytes, mime_type: str, filename: str | None = None) -> tuple[str, bytes, str]:
    """Build the SDK's explicit (filename, bytes, content-type) multipart file tuple."""
    content_type = mime_type.split(";", 1)[0].strip().lower()
    extension = MIME_EXTENSIONS.get(content_type)
    if not extension:
        raise VoiceTranscriptionError(
            "This browser recording format is not supported. Use a browser that records WebM, Ogg, or MP4 audio.",
            stage="audio_validation",
            category="unsupported_audio_format",
            http_status=422,
        )
    container, signature = audio_container_metadata(audio_bytes)
    expected_containers = {
        "audio/webm": {"webm"},
        "audio/ogg": {"ogg"},
        "audio/opus": {"ogg"},
        "audio/mp4": {"mp4"},
        "audio/wav": {"wav"},
        "audio/x-wav": {"wav"},
        "audio/flac": {"flac"},
        "audio/x-flac": {"flac"},
        "audio/mpeg": {"mpeg_or_aac"},
        "audio/mp3": {"mpeg_or_aac"},
        "audio/aac": {"mpeg_or_aac"},
    }
    if container not in expected_containers.get(content_type, {container}):
        raise VoiceTranscriptionError(
            "The recording bytes do not match the browser-reported audio format. Please record again using WebM, Ogg, or MP4.",
            stage="audio_validation",
            category="container_mismatch",
            http_status=422,
        )
    source_name = Path(filename or "recording").name
    supplied_extension = Path(source_name).suffix.removeprefix(".").lower()
    if supplied_extension and supplied_extension != extension:
        logger.warning(
            "Voice transcription metadata mismatch stage=audio_validation filename_extension=%s content_type=%s expected_extension=%s",
            supplied_extension,
            content_type,
            extension,
        )
    # The file is not converted or relabelled arbitrarily: its name and MIME are
    # both derived from the browser-reported recording MIME type.
    return (f"recording.{extension}", audio_bytes, content_type)


def ensure_audio_bytes(audio_bytes: bytes) -> None:
    if not audio_bytes:
        raise VoiceTranscriptionError(
            "No audio was received. Record a question and try again.",
            stage="audio_validation",
            category="empty_audio",
            http_status=422,
        )


def transcribe_audio(audio_bytes: bytes, mime_type: str, filename: str | None = None) -> str:
    """Create a private text record using ElevenLabs Scribe v2."""
    ensure_audio_bytes(audio_bytes)
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        logger.warning("Voice transcription failed stage=config exception_type=MissingConfiguration provider_status=None category=configuration message=ELEVENLABS_API_KEY is not configured")
        raise VoiceTranscriptionError(
            "Voice transcription is unavailable because ElevenLabs is not configured.",
            stage="config",
            category="configuration",
        )
    audio_file = scribe_upload_file(audio_bytes, mime_type, filename)
    logger.info(
        "Voice transcription request stage=elevenlabs_scribe_request endpoint=v1/speech-to-text multipart_field=file model_id=scribe_v2 filename=%s content_type=%s byte_length=%s container=%s signature_hex=%s",
        audio_file[0],
        audio_file[2],
        len(audio_bytes),
        *audio_container_metadata(audio_bytes),
    )
    try:
        transcript = ElevenLabs(api_key=api_key).speech_to_text.convert(
            file=audio_file,
            model_id="scribe_v2",
            language_code=None,
            tag_audio_events=False,
        )
    except Exception as error:
        message, http_status, category = _failure_details(error)
        provider_status = _provider_status(error)
        logger.warning(
            "Voice transcription failed stage=elevenlabs_scribe_request exception_type=%s provider_status=%s category=%s message=%s",
            type(error).__name__,
            provider_status,
            category,
            _sanitize_provider_message(error),
        )
        raise VoiceTranscriptionError(
            message,
            stage="elevenlabs_scribe_request",
            provider_status=provider_status,
            category=category,
            http_status=http_status,
        ) from error
    return transcript.text.strip() if transcript.text else "I could not understand that recording."


def answer_voice_question(transcript: str, context: list[str], conversation_history: list[dict[str, str]] | None = None) -> str:
    return answer_question(transcript, context, conversation_history)
