"""LegalGenie local API: persistent workspace data and mock AI responses."""
from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

DATA_DIR = Path(__file__).parent / "data"
DB_PATH = DATA_DIR / "legalgenie.db"
app = FastAPI(title="LegalGenie API", version="1.0.0")


def db() -> sqlite3.Connection:
    DATA_DIR.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def rows(cursor: sqlite3.Cursor) -> list[dict[str, Any]]:
    return [dict(row) for row in cursor.fetchall()]


def uid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def init_db() -> None:
    conn = db()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
          organisation TEXT NOT NULL, password TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL,
          uploaded_at TEXT NOT NULL, pages INTEGER NOT NULL, size TEXT NOT NULL,
          status TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY, title TEXT NOT NULL, document_name TEXT NOT NULL,
          last_active TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, role TEXT NOT NULL,
          content TEXT NOT NULL, created_at TEXT NOT NULL, sources TEXT DEFAULT '[]'
        );
        CREATE TABLE IF NOT EXISTS summaries (
          id TEXT PRIMARY KEY, document_name TEXT NOT NULL, generated_at TEXT NOT NULL,
          preview TEXT NOT NULL, sections TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS drafts (
          id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, context TEXT NOT NULL,
          related_document TEXT, content TEXT NOT NULL, created_at TEXT NOT NULL
        );
        """
    )
    if conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0:
        conn.execute(
            "INSERT INTO users VALUES (?, ?, ?, ?, ?)",
            ("u_1", "Alex Morgan", "alex.morgan@meridianlaw.co", "Meridian Law Associates", "demo"),
        )
        for name, kind, uploaded, pages, size, status in [
            ("Employment Agreement.pdf", "Employment", "2026-08-12", 14, "1.2 MB", "analysed"),
            ("Non Disclosure Agreement.pdf", "NDA", "2026-08-10", 6, "480 KB", "analysed"),
            ("Residential Lease Agreement.pdf", "Lease", "2026-08-08", 22, "2.4 MB", "analysed"),
            ("Service Agreement.pdf", "Contract", "2026-08-15", 9, "760 KB", "processing"),
            ("Legal Notice.pdf", "Notice", "2026-08-16", 3, "210 KB", "failed"),
        ]:
            conn.execute("INSERT INTO documents VALUES (?, ?, ?, ?, ?, ?, ?)", (uid("doc"), name, kind, uploaded, pages, size, status))
        conn.execute("INSERT INTO conversations VALUES (?, ?, ?, ?)", ("conv_1", "Employment Contract Review", "Employment Agreement.pdf", "2026-08-18T10:24:00Z"))
        for role, content, sources in [
            ("user", "What are the termination conditions in this agreement?", "[]"),
            ("assistant", "Based on the uploaded agreement, either party may end the employment relationship with 30 days written notice. Immediate termination is also permitted for material breach, gross misconduct, or wilful negligence. Please review the exact clause with qualified legal counsel.", '[{"document":"Employment Agreement.pdf","page":8}]'),
        ]:
            conn.execute("INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?)", (uid("msg"), "conv_1", role, content, "2026-08-18T10:20:00Z", sources))
        sections = [
            {"id": uid("s"), "title": "Document Purpose", "content": "This agreement establishes the terms of employment, including the rights and responsibilities of both parties."},
            {"id": uid("s"), "title": "Major Obligations", "content": "The employee must perform assigned duties, protect confidential information and comply with company policies."},
            {"id": uid("s"), "title": "Potential Risks", "content": "Review the non-compete, termination and intellectual-property provisions with a qualified legal professional."},
        ]
        conn.execute(
            "INSERT INTO summaries VALUES (?, ?, ?, ?, ?)",
            ("sum_1", "Employment Agreement.pdf", "2026-08-12", "A standard employment agreement covering compensation, benefits, termination, confidentiality and non-compete obligations.", json.dumps(sections)),
        )
        conn.execute(
            "INSERT INTO drafts VALUES (?, ?, ?, ?, ?, ?, ?)",
            ("draft_1", "legal_notice", "Notice of Contract Breach", "Service provider failed to deliver agreed services by the deadline specified in Section 4.2.", "Service Agreement.pdf", "LEGAL NOTICE\n\nDate: [DATE]\n\nSubject: Notice of Breach of Service Agreement\n\nDear [NAME],\n\nThis notice is served with reference to the Service Agreement. The obligations described in Section 4.2 have not been fulfilled. Please remedy the breach within [NUMBER] days.\n\nSincerely,\n\n[NAME]", "2026-08-14"),
        )
    conn.commit()
    conn.close()


@app.on_event("startup")
def startup() -> None:
    init_db()


class LoginRequest(BaseModel):
    email: str
    password: str


class SignupRequest(LoginRequest):
    name: str
    organisation: str


class ConversationRequest(BaseModel):
    title: str = "New Conversation"
    document_name: str = "Employment Agreement.pdf"


class QuestionRequest(BaseModel):
    question: str = Field(min_length=1)


class SummaryRequest(BaseModel):
    document_name: str


class DraftRequest(BaseModel):
    type: str
    context: str = Field(min_length=1)
    related_document: str | None = None
    additional_instructions: str = ""


class ProfileRequest(BaseModel):
    name: str
    email: str
    organisation: str


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/auth/login")
def login(payload: LoginRequest) -> dict[str, Any]:
    conn = db()
    user = conn.execute("SELECT id, name, email, organisation, password FROM users WHERE email = ?", (payload.email.lower(),)).fetchone()
    conn.close()
    if not user or user["password"] != payload.password:
        raise HTTPException(401, "Incorrect email or password.")
    return {key: user[key] for key in ("id", "name", "email", "organisation")}


@app.post("/auth/signup")
def signup(payload: SignupRequest) -> dict[str, Any]:
    conn = db()
    if conn.execute("SELECT 1 FROM users WHERE email = ?", (payload.email.lower(),)).fetchone():
        raise HTTPException(409, "An account with that email already exists.")
    user = {"id": uid("u"), "name": payload.name, "email": payload.email.lower(), "organisation": payload.organisation}
    conn.execute("INSERT INTO users VALUES (?, ?, ?, ?, ?)", (*user.values(), payload.password))
    conn.commit(); conn.close()
    return user


@app.put("/users/{user_id}")
def update_profile(user_id: str, payload: ProfileRequest) -> dict[str, Any]:
    conn = db()
    conn.execute("UPDATE users SET name=?, email=?, organisation=? WHERE id=?", (payload.name, payload.email.lower(), payload.organisation, user_id))
    conn.commit()
    user = conn.execute("SELECT id, name, email, organisation FROM users WHERE id=?", (user_id,)).fetchone()
    conn.close()
    if not user: raise HTTPException(404, "User not found")
    return dict(user)


@app.get("/documents")
def documents() -> list[dict[str, Any]]:
    conn = db(); result = rows(conn.execute("SELECT id, name, type, uploaded_at AS uploadedAt, pages, size, status FROM documents ORDER BY uploaded_at DESC")); conn.close(); return result


@app.post("/documents/upload")
async def upload_document(file: UploadFile = File(...)) -> dict[str, Any]:
    content = await file.read()
    doc = {"id": uid("doc"), "name": file.filename or "Untitled document.pdf", "type": "Document", "uploadedAt": str(date.today()), "pages": 0, "size": f"{len(content) / 1024 / 1024:.1f} MB", "status": "analysed"}
    conn = db(); conn.execute("INSERT INTO documents VALUES (?, ?, ?, ?, ?, ?, ?)", (doc["id"], doc["name"], doc["type"], doc["uploadedAt"], doc["pages"], doc["size"], doc["status"])); conn.commit(); conn.close(); return doc


@app.delete("/documents/{document_id}")
def delete_document(document_id: str) -> dict[str, bool]:
    conn = db(); conn.execute("DELETE FROM documents WHERE id=?", (document_id,)); conn.commit(); conn.close(); return {"ok": True}


def conversation_payload(conversation: dict[str, Any]) -> dict[str, Any]:
    conn = db()
    conversation["messages"] = rows(conn.execute("SELECT id, role, content, created_at AS createdAt, sources FROM messages WHERE conversation_id=? ORDER BY created_at", (conversation["id"],)))
    for message in conversation["messages"]:
        message["sources"] = json.loads(message.pop("sources"))
    conn.close(); return conversation


@app.get("/conversations")
def conversations() -> list[dict[str, Any]]:
    conn = db(); items = rows(conn.execute("SELECT id, title, document_name AS documentName, last_active AS lastActive FROM conversations ORDER BY last_active DESC")); conn.close(); return [conversation_payload(item) for item in items]


@app.post("/conversations")
def create_conversation(payload: ConversationRequest) -> dict[str, Any]:
    item = {"id": uid("conv"), "title": payload.title, "documentName": payload.document_name, "lastActive": datetime.now(timezone.utc).isoformat()}
    conn = db(); conn.execute("INSERT INTO conversations VALUES (?, ?, ?, ?)", (item["id"], item["title"], item["documentName"], item["lastActive"])); conn.commit(); conn.close(); item["messages"] = []; return item


@app.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: str) -> dict[str, bool]:
    conn = db(); conn.execute("DELETE FROM messages WHERE conversation_id=?", (conversation_id,)); conn.execute("DELETE FROM conversations WHERE id=?", (conversation_id,)); conn.commit(); conn.close(); return {"ok": True}


@app.post("/conversations/{conversation_id}/question")
def ask_question(conversation_id: str, payload: QuestionRequest) -> dict[str, Any]:
    conn = db(); conversation = conn.execute("SELECT document_name FROM conversations WHERE id=?", (conversation_id,)).fetchone()
    if not conversation: raise HTTPException(404, "Conversation not found")
    document_name = conversation[0]
    answer = f"Based on the uploaded {document_name}, the relevant provisions establish obligations and timelines for the parties. For your question, \"{payload.question}\", review the applicable clause and its definitions in context. This is general legal information, not legal advice; a qualified lawyer can advise on your circumstances."
    now = datetime.now(timezone.utc).isoformat(); import json
    for role, content, sources in [("user", payload.question, []), ("assistant", answer, [{"document": document_name, "page": 1}])]:
        conn.execute("INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?)", (uid("msg"), conversation_id, role, content, now, json.dumps(sources)))
    conn.execute("UPDATE conversations SET last_active=? WHERE id=?", (now, conversation_id)); conn.commit(); conn.close(); return {"content": answer, "sources": [{"document": document_name, "page": 1}]}


@app.get("/summaries")
def summaries() -> list[dict[str, Any]]:
    conn = db(); result = rows(conn.execute("SELECT id, document_name AS documentName, generated_at AS generatedAt, preview, sections FROM summaries ORDER BY generated_at DESC")); conn.close()
    for item in result: item["sections"] = json.loads(item["sections"])
    return result


@app.post("/summaries")
def create_summary(payload: SummaryRequest) -> dict[str, Any]:
    sections = [{"id": uid("s"), "title": title, "content": content} for title, content in [
        ("Document Purpose", "This document establishes the legal framework and terms between the involved parties."),
        ("Major Obligations", "Both parties are subject to the performance obligations described in the governing sections."),
        ("Potential Risks", "Review termination, liability and notice provisions with qualified legal counsel before relying on this document."),
    ]]
    item = {"id": uid("sum"), "documentName": payload.document_name, "generatedAt": str(date.today()), "preview": f"AI-generated summary of {payload.document_name} covering key terms, obligations and risks.", "sections": sections}
    conn = db(); conn.execute("INSERT INTO summaries VALUES (?, ?, ?, ?, ?)", (item["id"], item["documentName"], item["generatedAt"], item["preview"], json.dumps(sections))); conn.commit(); conn.close(); return item


@app.get("/drafts")
def drafts() -> list[dict[str, Any]]:
    conn = db(); result = rows(conn.execute("SELECT id, type, title, context, related_document AS relatedDocument, content, created_at AS createdAt FROM drafts ORDER BY created_at DESC")); conn.close(); return result


@app.post("/drafts")
def create_draft(payload: DraftRequest) -> dict[str, Any]:
    label = payload.type.replace("_", " ").title()
    content = f"{label.upper()}\n\nDate: [DATE]\n\nTo: [NAME]\n    [ADDRESS]\n\nSubject: {payload.context[:80]}\n\nDear [NAME],\n\n{('This draft refers to ' + payload.related_document + '. ') if payload.related_document else ''}Based on the context provided: {payload.context}\n\n[This preliminary draft should be reviewed and tailored by a qualified legal professional.]\n\nSincerely,\n\n[NAME]\n[DESIGNATION]"
    item = {"id": uid("draft"), "type": payload.type, "title": f"{label} — {payload.context[:40]}", "context": payload.context, "relatedDocument": payload.related_document, "content": content, "createdAt": str(date.today())}
    conn = db(); conn.execute("INSERT INTO drafts VALUES (?, ?, ?, ?, ?, ?, ?)", (item["id"], item["type"], item["title"], item["context"], item["relatedDocument"], item["content"], item["createdAt"])); conn.commit(); conn.close(); return item


@app.post("/voice")
def voice(payload: QuestionRequest) -> dict[str, str]:
    return {"content": f"Based on your question regarding \"{payload.question[:80]}\", LegalGenie can provide general legal information. The applicable legal principles depend on the facts and jurisdiction, so please consult a qualified legal professional for advice tailored to your circumstances."}
