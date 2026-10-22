from types import SimpleNamespace

import pytest
from agents import legal_agent, voice_agent


class RetryableError(Exception):
    status_code = 503


def test_gemini_retries_transient_failures(monkeypatch):
    attempts = [RetryableError("503 unavailable"), RetryableError("503 unavailable"), SimpleNamespace(text="Generated text")]

    class FakeModels:
        def generate_content(self, **_kwargs):
            next_attempt = attempts.pop(0)
            if isinstance(next_attempt, Exception):
                raise next_attempt
            return next_attempt

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(legal_agent.genai, "Client", lambda **_kwargs: SimpleNamespace(models=FakeModels()))
    monkeypatch.setattr(legal_agent.time, "sleep", lambda _seconds: None)

    assert legal_agent._complete("instructions", "prompt") == "Generated text"


def test_gemini_missing_configuration_is_not_reported_as_a_response(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    with pytest.raises(legal_agent.AIProviderError, match="not configured"):
        legal_agent._complete("instructions", "prompt")


def test_gemini_network_failure_is_actionable_and_not_an_elevenlabs_failure(monkeypatch):
    class ConnectError(Exception):
        pass

    class FakeModels:
        def generate_content(self, **_kwargs):
            raise ConnectError("connection refused")

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(legal_agent.genai, "Client", lambda **_kwargs: SimpleNamespace(models=FakeModels()))

    with pytest.raises(legal_agent.AIProviderError, match="could not be reached") as error:
        legal_agent._complete("instructions", "prompt")

    assert error.value.category == "network_or_sdk"
    assert error.value.http_status == 503


def test_gemini_dns_failure_identifies_the_python_resolver(monkeypatch):
    class ConnectError(Exception):
        pass

    class FakeModels:
        def generate_content(self, **_kwargs):
            raise ConnectError("[Errno 11001] getaddrinfo failed")

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(legal_agent.genai, "Client", lambda **_kwargs: SimpleNamespace(models=FakeModels()))

    with pytest.raises(legal_agent.AIProviderError, match="Python runtime") as error:
        legal_agent._complete("instructions", "prompt")

    assert error.value.category == "dns_resolution"


def test_gemini_model_error_is_actionable(monkeypatch):
    class ModelError(Exception):
        status_code = 404

    class FakeModels:
        def generate_content(self, **_kwargs):
            raise ModelError()

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setenv("GEMINI_MODEL", "unavailable-model")
    monkeypatch.setattr(legal_agent.genai, "Client", lambda **_kwargs: SimpleNamespace(models=FakeModels()))

    with pytest.raises(legal_agent.AIProviderError, match="unavailable-model") as error:
        legal_agent._complete("instructions", "prompt")

    assert error.value.category == "model_unavailable"
    assert error.value.http_status == 502


@pytest.mark.parametrize(("mime_type", "filename", "audio_bytes", "expected"), [
    ("audio/webm;codecs=opus", "voice-question.webm", b"\x1aE\xdf\xa3webm", ("recording.webm", b"\x1aE\xdf\xa3webm", "audio/webm")),
    ("audio/ogg;codecs=opus", "voice-question.ogg", b"OggSopus", ("recording.ogg", b"OggSopus", "audio/ogg")),
    ("audio/mp4", "voice-question.mp4", b"\x00\x00\x00\x18ftypisom", ("recording.mp4", b"\x00\x00\x00\x18ftypisom", "audio/mp4")),
])
def test_voice_preserves_recording_mime_and_matching_filename(monkeypatch, mime_type, filename, audio_bytes, expected):
    captured = {}

    class FakeSpeechToText:
        def convert(self, *, file, **_kwargs):
            captured["file"] = file
            return SimpleNamespace(text="A recorded question")

    class FakeElevenLabs:
        def __init__(self, **_kwargs):
            self.speech_to_text = FakeSpeechToText()

    monkeypatch.setenv("ELEVENLABS_API_KEY", "test-key")
    monkeypatch.setattr(voice_agent, "ElevenLabs", FakeElevenLabs)

    assert voice_agent.transcribe_audio(audio_bytes, mime_type, filename) == "A recorded question"
    assert captured["file"] == expected


def test_voice_rejects_unknown_browser_mime_before_provider_call(monkeypatch):
    monkeypatch.setenv("ELEVENLABS_API_KEY", "test-key")

    with pytest.raises(voice_agent.VoiceTranscriptionError, match="not supported") as error:
        voice_agent.transcribe_audio(b"audio", "audio/unknown", "voice-question.bin")

    assert error.value.http_status == 422
    assert error.value.category == "unsupported_audio_format"


def test_voice_rejects_empty_audio_before_provider_call():
    with pytest.raises(voice_agent.VoiceTranscriptionError, match="No audio") as error:
        voice_agent.ensure_audio_bytes(b"")

    assert error.value.http_status == 422
    assert error.value.category == "empty_audio"


def test_voice_provider_failure_is_not_presented_as_a_transcript(monkeypatch):
    class FakeSpeechToText:
        def convert(self, **_kwargs):
            raise RuntimeError("provider unavailable")

    class FakeElevenLabs:
        def __init__(self, **_kwargs):
            self.speech_to_text = FakeSpeechToText()

    monkeypatch.setenv("ELEVENLABS_API_KEY", "test-key")
    monkeypatch.setattr(voice_agent, "ElevenLabs", FakeElevenLabs)

    with pytest.raises(voice_agent.VoiceTranscriptionError, match="could not reach"):
        voice_agent.transcribe_audio(b"\x1aE\xdf\xa3webm", "audio/webm")


def test_voice_provider_authentication_failure_is_actionable_and_sanitized(monkeypatch):
    class AuthenticationError(Exception):
        status_code = 401

        def __str__(self):
            return "Authorization: secret-value"

    class FakeSpeechToText:
        def convert(self, **_kwargs):
            raise AuthenticationError()

    class FakeElevenLabs:
        def __init__(self, **_kwargs):
            self.speech_to_text = FakeSpeechToText()

    monkeypatch.setenv("ELEVENLABS_API_KEY", "test-key")
    monkeypatch.setattr(voice_agent, "ElevenLabs", FakeElevenLabs)

    with pytest.raises(voice_agent.VoiceTranscriptionError) as error:
        voice_agent.transcribe_audio(b"\x1aE\xdf\xa3webm", "audio/webm")

    assert error.value.http_status == 502
    assert error.value.provider_status == 401
    assert "credentials were rejected" in str(error.value)
    assert "secret-value" not in str(error.value)


def test_voice_malformed_audio_provider_error_is_not_a_success(monkeypatch):
    class InvalidAudioError(Exception):
        status_code = 400

        def __init__(self):
            self.body = {"message": "Audio container could not be decoded"}

    class FakeSpeechToText:
        def convert(self, **_kwargs):
            raise InvalidAudioError()

    class FakeElevenLabs:
        def __init__(self, **_kwargs):
            self.speech_to_text = FakeSpeechToText()

    monkeypatch.setenv("ELEVENLABS_API_KEY", "test-key")
    monkeypatch.setattr(voice_agent, "ElevenLabs", FakeElevenLabs)

    with pytest.raises(voice_agent.VoiceTranscriptionError, match="container could not be decoded") as error:
        voice_agent.transcribe_audio(b"\x1aE\xdf\xa3malformed", "audio/webm", "voice-question.webm")

    assert error.value.http_status == 422
    assert error.value.provider_status == 400
    assert error.value.category == "invalid_audio"


def test_voice_rejects_container_mismatch_before_provider_call(monkeypatch):
    monkeypatch.setenv("ELEVENLABS_API_KEY", "test-key")

    with pytest.raises(voice_agent.VoiceTranscriptionError, match="do not match") as error:
        voice_agent.transcribe_audio(b"OggSopus", "audio/webm", "voice-question.webm")

    assert error.value.category == "container_mismatch"


def test_voice_extracts_a_nested_sanitized_provider_message():
    class InvalidAudioError(Exception):
        status_code = 400
        body = {"detail": {"message": "Audio is shorter than 100ms"}}

    assert voice_agent._sanitize_provider_message(InvalidAudioError()) == "Audio is shorter than 100ms"
