"""HTTP adapter for the existing LegalGenie services.

This module deliberately contains transport, authentication, and response-shaping
only. PDF processing, retrieval, Gemini generation, MongoDB/GridFS persistence,
and ElevenLabs transcription remain in their existing modules.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import os
import re
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path
from typing import Annotated, Any

from bson import ObjectId
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Header, HTTPException, Request, Response, UploadFile, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pymongo.errors import PyMongoError

from agents.draft_agent import create_draft
from agents.legal_agent import AIProviderError, answer_question
from agents.summary_agent import summarize
from agents.voice_agent import VoiceTranscriptionError, answer_voice_question, audio_container_metadata, ensure_audio_bytes, transcribe_audio
from database.mongodb import MongoRepository
from rag.pdf_reader import chunk_text_with_sources, extract_pdf_pages
from rag.vector_store import LocalVectorStore

# Load the backend's configuration even when Uvicorn is started from another directory.
load_dotenv(Path(__file__).resolve().with_name(".env"))

logger = logging.getLogger(__name__)

app = FastAPI(title="LegalGenie API", version="1.0.0")
origins = [origin.strip() for origin in os.getenv("LEGALGENIE_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if origin.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.exception_handler(PyMongoError)
async def database_unavailable(_: Request, __: PyMongoError) -> JSONResponse:
    """Make external Atlas connectivity failures actionable without exposing details."""
    return JSONResponse(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, content={"detail": "Database unavailable. Check MongoDB Atlas network access and connectivity."})


@app.exception_handler(AIProviderError)
async def ai_provider_unavailable(_: Request, error: AIProviderError) -> JSONResponse:
    return JSONResponse(status_code=error.http_status, content={"detail": str(error)})


@app.exception_handler(VoiceTranscriptionError)
async def voice_provider_unavailable(_: Request, error: VoiceTranscriptionError) -> JSONResponse:
    return JSONResponse(status_code=error.http_status, content={"detail": str(error)})


@lru_cache
def repository() -> MongoRepository:
    return MongoRepository()


@lru_cache
def vector_store() -> LocalVectorStore:
    return LocalVectorStore()


def _secret() -> bytes:
    value = os.getenv("LEGALGENIE_API_AUTH_SECRET")
    if not value:
        raise RuntimeError("LEGALGENIE_API_AUTH_SECRET is missing. Configure it before starting the API.")
    return value.encode("utf-8")


def issue_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": int((datetime.now(timezone.utc) + timedelta(days=7)).timestamp())}
    body = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).decode().rstrip("=")
    signature = hmac.new(_secret(), body.encode(), hashlib.sha256).digest()
    return f"{body}.{base64.urlsafe_b64encode(signature).decode().rstrip('=')}"


def current_user(authorization: Annotated[str | None, Header()] = None) -> dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication is required.")
    try:
        body, supplied = authorization.removeprefix("Bearer ").split(".", 1)
        expected = base64.urlsafe_b64encode(hmac.new(_secret(), body.encode(), hashlib.sha256).digest()).decode().rstrip("=")
        payload = json.loads(base64.urlsafe_b64decode(body + "=" * (-len(body) % 4)))
        if not hmac.compare_digest(supplied, expected) or payload["exp"] < int(datetime.now(timezone.utc).timestamp()):
            raise ValueError
    except (ValueError, KeyError, json.JSONDecodeError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired authentication token.") from None
    user = repository().db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found.")
    return user


def iso(value: datetime | None) -> str:
    return (value or datetime.now(timezone.utc)).isoformat()


def user_out(user: dict[str, Any]) -> dict[str, str]:
    return {"id": str(user["_id"]), "name": user["name"], "email": user["email"], "organisation": user.get("organisation", "")}


def document_out(document: dict[str, Any]) -> dict[str, Any]:
    file_length = int(document.get("file_length", 0))
    return {"id": str(document["_id"]), "name": document["name"], "type": "Document", "uploadedAt": iso(document.get("created_at")), "pages": document.get("page_count", 0), "size": f"{file_length / 1024 / 1024:.1f} MB", "status": document.get("status", "analysed")}


def citation_results(document: dict[str, Any], question: str) -> tuple[list[str], list[dict[str, Any]]]:
    hits = vector_store().search_with_metadata(str(document["_id"]), document["chunks"], question)
    sources = document.get("chunk_sources", [])
    citations = []
    for hit in hits:
        metadata = sources[hit["index"]] if hit["index"] < len(sources) else {}
        citations.append({"document": document["name"], "page": metadata.get("page", 1), "snippet": metadata.get("snippet", hit["content"][:320])})
    return [str(hit["content"]) for hit in hits], citations


def recent_history(session_id: str, limit: int = 8) -> list[dict[str, str]]:
    """Keep mixed text/voice follow-ups grounded in the existing conversation."""
    messages = repository().get_messages(session_id)[-limit:]
    return [{"role": message["role"], "content": message["content"]} for message in messages]


def markdown_sections(content: str) -> list[dict[str, str]]:
    pieces = re.split(r"^#{1,3}\s+(.+)$", content, flags=re.MULTILINE)
    if len(pieces) == 1:
        return [{"id": "overview", "title": "Summary", "content": content}]
    sections = []
    for index in range(1, len(pieces), 2):
        sections.append({"id": f"section-{index}", "title": pieces[index].strip(), "content": pieces[index + 1].strip()})
    return sections


class Credentials(BaseModel):
    email: str
    password: str = Field(min_length=8)


class Signup(Credentials):
    name: str = Field(min_length=1)
    organisation: str = ""


class Profile(BaseModel):
    name: str = Field(min_length=1)
    email: str
    organisation: str = ""


class SessionCreate(BaseModel):
    title: str = "New Conversation"
    document_id: str | None = None


class Question(BaseModel):
    question: str = Field(min_length=1)


class SummaryCreate(BaseModel):
    document_id: str


class DraftCreate(BaseModel):
    type: str = "other"
    context: str = Field(min_length=1)
    related_document_id: str | None = None
    session_id: str | None = None
    additional_instructions: str = ""


class VoiceSessionCreate(BaseModel):
    document_id: str | None = None
    conversation_id: str | None = None


class HealthOut(BaseModel):
    status: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    organisation: str


class AuthOut(BaseModel):
    user: UserOut
    accessToken: str


class DocumentOut(BaseModel):
    id: str
    name: str
    type: str
    uploadedAt: str
    pages: int
    size: str
    status: str


class Citation(BaseModel):
    document: str
    page: int
    snippet: str


class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    agent: str | None = None
    createdAt: str
    sources: list[Citation] = []


class ConversationOut(BaseModel):
    id: str
    title: str
    documentId: str | None = None
    documentName: str
    lastActive: str
    messages: list[MessageOut]


class ConversationCreated(BaseModel):
    id: str
    title: str
    documentId: str | None = None
    messages: list[MessageOut]


class ChatOut(BaseModel):
    content: str
    sources: list[Citation]


class SummaryOut(BaseModel):
    id: str
    documentId: str
    documentName: str
    generatedAt: str
    preview: str
    sections: list[dict[str, str]]


class DraftOut(BaseModel):
    id: str
    type: str
    title: str
    context: str
    relatedDocument: str | None = None
    content: str
    createdAt: str


class VoiceSessionOut(BaseModel):
    sessionId: str


class VoiceOut(BaseModel):
    transcript: str
    content: str
    sources: list[Citation]


@app.get("/health", response_model=HealthOut)
def health() -> HealthOut:
    repository().client.admin.command("ping")
    _secret()
    return {"status": "ok"}


@app.post("/auth/signup", status_code=status.HTTP_201_CREATED, response_model=AuthOut)
def signup(payload: Signup) -> AuthOut:
    try:
        user = repository().create_api_user(payload.name, payload.email, payload.organisation, payload.password)
    except ValueError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    return {"user": user_out(user), "accessToken": issue_token(str(user["_id"]))}


@app.post("/auth/login", response_model=AuthOut)
def login(payload: Credentials) -> AuthOut:
    user = repository().authenticate_api_user(payload.email, payload.password)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password.")
    return {"user": user_out(user), "accessToken": issue_token(str(user["_id"]))}


@app.get("/profile", response_model=UserOut)
def get_profile(user: dict[str, Any] = Depends(current_user)) -> UserOut:
    return user_out(user)


@app.put("/profile", response_model=UserOut)
def update_profile(payload: Profile, user: dict[str, Any] = Depends(current_user)) -> UserOut:
    updated = repository().update_api_user(str(user["_id"]), payload.name, payload.email, payload.organisation)
    if not updated:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    return user_out(updated)


@app.get("/documents", response_model=list[DocumentOut])
def list_documents(user: dict[str, Any] = Depends(current_user)) -> list[DocumentOut]:
    return [document_out(document) for document in repository().list_documents(str(user["_id"]))]


@app.post("/documents/upload", status_code=status.HTTP_201_CREATED, response_model=DocumentOut)
async def upload_document(file: UploadFile = File(...), user: dict[str, Any] = Depends(current_user)) -> DocumentOut:
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Only PDF uploads are supported.")
    content = await file.read()
    if not content:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "The uploaded file is empty.")
    try:
        pages = extract_pdf_pages(content)
        text = "\n\n".join(page for page in pages if page)
        chunks, sources = chunk_text_with_sources(text, pages)
        document_id = repository().create_document(file.filename or "Untitled.pdf", content, text, chunks, "", str(user["_id"]), sources)
        index_path = vector_store().create(document_id, chunks)
        repository().update_document_index_path(document_id, index_path, str(user["_id"]))
        repository().db.documents.update_one({"_id": ObjectId(document_id), "user_id": str(user["_id"])}, {"$set": {"page_count": len(pages), "file_length": len(content), "status": "analysed"}})
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc
    document = repository().get_document(document_id, str(user["_id"]))
    return document_out(document)


@app.get("/documents/{document_id}", response_model=DocumentOut)
def get_document(document_id: str, user: dict[str, Any] = Depends(current_user)) -> DocumentOut:
    document = repository().get_document(document_id, str(user["_id"]))
    if not document:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found.")
    return document_out(document)


@app.get("/documents/{document_id}/download")
def download_document(document_id: str, user: dict[str, Any] = Depends(current_user)) -> Response:
    file = repository().get_document_file(document_id, str(user["_id"]))
    if not file:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found.")
    return Response(file.read(), media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{file.filename}"'})


@app.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(document_id: str, user: dict[str, Any] = Depends(current_user)) -> None:
    if not repository().delete_document(document_id, str(user["_id"])):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found.")


@app.get("/conversations", response_model=list[ConversationOut])
def list_conversations(user: dict[str, Any] = Depends(current_user)) -> list[ConversationOut]:
    result = []
    for session in repository().list_sessions(str(user["_id"])):
        document = repository().get_document(session["document_id"], str(user["_id"])) if session.get("document_id") else None
        messages = repository().get_messages(str(session["_id"]))
        result.append({"id": str(session["_id"]), "title": session["title"], "documentId": session.get("document_id"), "documentName": document["name"] if document else "No document", "lastActive": iso(session.get("last_active")), "messages": [{"id": str(message.get("_id", "")), "role": message["role"], "content": message["content"], "agent": message.get("agent"), "createdAt": iso(message.get("created_at")), "sources": message.get("sources", [])} for message in messages]})
    return result


@app.post("/conversations", status_code=status.HTTP_201_CREATED, response_model=ConversationCreated)
def create_conversation(payload: SessionCreate, user: dict[str, Any] = Depends(current_user)) -> ConversationCreated:
    if payload.document_id and not repository().get_document(payload.document_id, str(user["_id"])):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found.")
    session_id = repository().create_session(payload.title, payload.document_id, str(user["_id"]))
    return {"id": session_id, "title": payload.title, "documentId": payload.document_id, "messages": []}


@app.delete("/conversations/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(session_id: str, user: dict[str, Any] = Depends(current_user)) -> None:
    if not repository().delete_session(session_id, str(user["_id"])):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found.")


@app.post("/conversations/{session_id}/question", response_model=ChatOut)
def ask_question(session_id: str, payload: Question, user: dict[str, Any] = Depends(current_user)) -> ChatOut:
    session = repository().get_session(session_id, str(user["_id"]))
    if not session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found.")
    document = repository().get_document(session["document_id"], str(user["_id"])) if session.get("document_id") else None
    context, sources = citation_results(document, payload.question) if document else ([], [])
    response = answer_question(payload.question, context, recent_history(session_id))
    repository().add_message(session_id, "user", payload.question, "legal_qa")
    repository().add_message(session_id, "assistant", response, "legal_qa")
    repository().db.messages.update_one({"session_id": session_id, "role": "assistant", "content": response}, {"$set": {"sources": sources}}, sort=[("created_at", -1)])
    return {"content": response, "sources": sources}


@app.get("/summaries", response_model=list[SummaryOut])
def list_summaries(user: dict[str, Any] = Depends(current_user)) -> list[SummaryOut]:
    response = []
    for summary in repository().list_summaries(str(user["_id"])):
        document = repository().get_document(summary["document_id"], str(user["_id"]))
        response.append({"id": str(summary["_id"]), "documentId": summary["document_id"], "documentName": document["name"] if document else "Deleted document", "generatedAt": iso(summary.get("created_at")), "preview": summary["content"][:240], "sections": markdown_sections(summary["content"])})
    return response


@app.post("/summaries", status_code=status.HTTP_201_CREATED, response_model=SummaryOut)
def create_summary(payload: SummaryCreate, user: dict[str, Any] = Depends(current_user)) -> SummaryOut:
    document = repository().get_document(payload.document_id, str(user["_id"]))
    if not document:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found.")
    text = document.get("extracted_text", "").strip()
    if not text:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Document has no extractable text. Upload a text-based PDF before generating a summary.")
    content = summarize(text)
    summary_id = repository().save_summary(payload.document_id, content, str(user["_id"]))
    return {"id": summary_id, "documentId": payload.document_id, "documentName": document["name"], "generatedAt": iso(None), "preview": content[:240], "sections": markdown_sections(content)}


@app.get("/drafts", response_model=list[DraftOut])
def list_drafts(user: dict[str, Any] = Depends(current_user)) -> list[DraftOut]:
    return [{"id": str(draft["_id"]), "type": draft.get("type", "other"), "title": draft["prompt"][:60] or "Draft", "context": draft["prompt"], "relatedDocument": draft.get("related_document"), "content": draft["content"], "createdAt": iso(draft.get("created_at"))} for draft in repository().list_drafts(str(user["_id"]))]


@app.post("/drafts", status_code=status.HTTP_201_CREATED, response_model=DraftOut)
def create_draft_endpoint(payload: DraftCreate, user: dict[str, Any] = Depends(current_user)) -> DraftOut:
    related = repository().get_document(payload.related_document_id, str(user["_id"])) if payload.related_document_id else None
    if payload.related_document_id and not related:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Related document not found.")
    session_id = payload.session_id
    if session_id and not repository().get_session(session_id, str(user["_id"])):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found.")
    context, _ = citation_results(related, payload.context) if related else ([], [])
    request = payload.context
    if payload.additional_instructions.strip():
        request += f"\n\nAdditional instructions: {payload.additional_instructions.strip()}"
    content = create_draft(request, context)
    draft_id = repository().save_draft(session_id or "", payload.context, content, str(user["_id"]), payload.type, related["name"] if related else None)
    return {"id": draft_id, "type": payload.type, "title": payload.context[:60] or "Draft", "context": payload.context, "relatedDocument": related["name"] if related else None, "content": content, "createdAt": iso(None)}


@app.post("/voice/sessions", status_code=status.HTTP_201_CREATED, response_model=VoiceSessionOut)
def create_voice_session(payload: VoiceSessionCreate, user: dict[str, Any] = Depends(current_user)) -> VoiceSessionOut:
    if payload.document_id and not repository().get_document(payload.document_id, str(user["_id"])):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found.")
    if payload.conversation_id:
        conversation = repository().get_session(payload.conversation_id, str(user["_id"]))
        if not conversation:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found.")
        if payload.document_id != conversation.get("document_id"):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Voice and conversation documents must match.")
    voice_session_id = repository().create_voice_session(str(user["_id"]), payload.document_id)
    if payload.conversation_id:
        repository().db.voice_sessions.update_one({"_id": ObjectId(voice_session_id)}, {"$set": {"conversation_id": payload.conversation_id}})
    return {"sessionId": voice_session_id}


@app.post("/voice/sessions/{voice_session_id}/audio", response_model=VoiceOut)
async def process_voice_audio(voice_session_id: str, file: UploadFile = File(...), user: dict[str, Any] = Depends(current_user)) -> VoiceOut:
    try:
        voice_session_object_id = ObjectId(voice_session_id)
    except Exception:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Voice session not found.") from None
    voice_session = repository().db.voice_sessions.find_one({"_id": voice_session_object_id, "user_id": str(user["_id"])})
    if not voice_session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Voice session not found.")
    audio_bytes = await file.read()
    ensure_audio_bytes(audio_bytes)
    container, signature = audio_container_metadata(audio_bytes)
    logger.info(
        "Voice audio upload received stage=fastapi_upload multipart_field=file filename=%s content_type=%s byte_length=%s container=%s signature_hex=%s",
        Path(file.filename or "recording").name,
        file.content_type or "unknown",
        len(audio_bytes),
        container,
        signature,
    )
    transcript = transcribe_audio(audio_bytes, file.content_type or "audio/wav", file.filename)
    document = repository().get_document(voice_session["document_id"], str(user["_id"])) if voice_session.get("document_id") else None
    context, sources = citation_results(document, transcript) if document else ([], [])
    history = recent_history(voice_session["conversation_id"]) if voice_session.get("conversation_id") else None
    response = answer_voice_question(transcript, context, history)
    repository().save_voice_transcript(voice_session_id, "user", transcript)
    repository().save_voice_transcript(voice_session_id, "assistant", response)
    if conversation_id := voice_session.get("conversation_id"):
        repository().add_message(conversation_id, "user", transcript, "voice")
        repository().add_message(conversation_id, "assistant", response, "voice")
        repository().db.messages.update_one(
            {"session_id": conversation_id, "role": "assistant", "content": response},
            {"$set": {"sources": sources}},
            sort=[("created_at", -1)],
        )
    return {"transcript": transcript, "content": response, "sources": sources}
