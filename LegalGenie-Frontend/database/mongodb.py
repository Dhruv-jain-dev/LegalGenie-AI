from __future__ import annotations

import base64
import hashlib
import os
import secrets
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from gridfs import GridFS
from pymongo import MongoClient
from pymongo.database import Database


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(password: str, salt: bytes | None = None) -> str:
    """Use a standard-library, salted password hash for API accounts."""
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1)
    return f"{base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def verify_password(password: str, encoded: str | None) -> bool:
    if not encoded or "$" not in encoded:
        return False
    salt_b64, _ = encoded.split("$", 1)
    return secrets.compare_digest(hash_password(password, base64.b64decode(salt_b64)), encoded)


class MongoRepository:
    """All durable application data lives in MongoDB collections."""

    def __init__(self, uri: str | None = None, database: str | None = None) -> None:
        uri = uri or os.getenv("MONGODB_URI")
        database = database or os.getenv("MONGODB_DATABASE", "legalgenie")
        if not uri:
            raise RuntimeError("MONGODB_URI is missing. Add it to .env before starting the app.")
        self.client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        self.db: Database = self.client[database]
        self.files = GridFS(self.db)
        self.client.admin.command("ping")
        self._ensure_indexes()

    def _ensure_indexes(self) -> None:
        self.db.documents.create_index("created_at")
        self.db.sessions.create_index("created_at")
        self.db.messages.create_index([("session_id", 1), ("created_at", 1)])
        self.db.documents.create_index([("user_id", 1), ("created_at", -1)])
        self.db.sessions.create_index([("user_id", 1), ("created_at", -1)])
        self.db.summaries.create_index([("user_id", 1), ("created_at", -1)])
        self.db.drafts.create_index([("user_id", 1), ("created_at", -1)])
        self.db.drafts.create_index("created_at")
        self.db.voice_transcripts.create_index([("voice_session_id", 1), ("created_at", 1)])
        self.db.users.create_index("email", unique=True)

    def create_document(self, name: str, content: bytes, extracted_text: str, chunks: list[str], index_path: str, user_id: str | None = None, chunk_sources: list[dict[str, Any]] | None = None) -> str:
        file_id = self.files.put(content, filename=name, content_type="application/pdf", uploaded_at=utcnow())
        result = self.db.documents.insert_one({
            "name": name,
            "content_type": "application/pdf",
            "file_id": file_id,
            "extracted_text": extracted_text,
            "chunks": chunks,
            "faiss_index_path": index_path,
            "chunk_sources": chunk_sources or [],
            "user_id": user_id,
            "created_at": utcnow(),
        })
        return str(result.inserted_id)

    def update_document_index_path(self, document_id: str, index_path: str, user_id: str | None = None) -> None:
        query: dict[str, Any] = {"_id": ObjectId(document_id)}
        if user_id is not None:
            query["user_id"] = user_id
        self.db.documents.update_one(query, {"$set": {"faiss_index_path": index_path}})

    def get_document(self, document_id: str, user_id: str | None = None) -> dict[str, Any] | None:
        try:
            query: dict[str, Any] = {"_id": ObjectId(document_id)}
        except Exception:
            return None
        if user_id is not None:
            query["user_id"] = user_id
        return self.db.documents.find_one(query)

    def list_documents(self, user_id: str | None = None) -> list[dict[str, Any]]:
        query = {"user_id": user_id} if user_id is not None else {}
        return list(self.db.documents.find(query, {"extracted_text": 0, "chunks": 0, "chunk_sources": 0}).sort("created_at", -1))

    def get_document_file(self, document_id: str, user_id: str) -> Any | None:
        document = self.get_document(document_id, user_id)
        return self.files.get(document["file_id"]) if document else None

    def delete_document(self, document_id: str, user_id: str) -> bool:
        document = self.get_document(document_id, user_id)
        if not document:
            return False
        self.db.documents.delete_one({"_id": document["_id"], "user_id": user_id})
        self.db.sessions.delete_many({"user_id": user_id, "document_id": document_id})
        self.files.delete(document["file_id"])
        path = document.get("faiss_index_path")
        if path:
            try:
                from pathlib import Path
                Path(path).unlink(missing_ok=True)
            except OSError:
                pass
        return True

    def create_session(self, title: str, document_id: str | None, user_id: str | None = None) -> str:
        result = self.db.sessions.insert_one({"title": title, "document_id": document_id, "user_id": user_id, "created_at": utcnow(), "last_active": utcnow()})
        return str(result.inserted_id)

    def get_session(self, session_id: str, user_id: str | None = None) -> dict[str, Any] | None:
        try:
            query: dict[str, Any] = {"_id": ObjectId(session_id)}
        except Exception:
            return None
        if user_id is not None:
            query["user_id"] = user_id
        return self.db.sessions.find_one(query)

    def list_sessions(self, user_id: str) -> list[dict[str, Any]]:
        return list(self.db.sessions.find({"user_id": user_id}).sort("last_active", -1))

    def delete_session(self, session_id: str, user_id: str) -> bool:
        session = self.get_session(session_id, user_id)
        if not session:
            return False
        self.db.messages.delete_many({"session_id": session_id})
        self.db.sessions.delete_one({"_id": session["_id"], "user_id": user_id})
        return True

    def add_message(self, session_id: str, role: str, content: str, agent: str) -> None:
        self.db.messages.insert_one({"session_id": session_id, "role": role, "content": content, "agent": agent, "created_at": utcnow()})
        self.db.sessions.update_one({"_id": ObjectId(session_id)}, {"$set": {"last_active": utcnow()}})

    def get_messages(self, session_id: str) -> list[dict[str, Any]]:
        return list(self.db.messages.find({"session_id": session_id}).sort("created_at", 1))

    def save_summary(self, document_id: str, content: str, user_id: str | None = None) -> str:
        return str(self.db.summaries.insert_one({"document_id": document_id, "user_id": user_id, "content": content, "created_at": utcnow()}).inserted_id)

    def list_summaries(self, user_id: str) -> list[dict[str, Any]]:
        return list(self.db.summaries.find({"user_id": user_id}).sort("created_at", -1))

    def save_draft(self, session_id: str, prompt: str, content: str, user_id: str | None = None, draft_type: str = "other", related_document: str | None = None) -> str:
        return str(self.db.drafts.insert_one({"session_id": session_id, "user_id": user_id, "prompt": prompt, "content": content, "type": draft_type, "related_document": related_document, "created_at": utcnow()}).inserted_id)

    def list_drafts(self, user_id: str) -> list[dict[str, Any]]:
        return list(self.db.drafts.find({"user_id": user_id}).sort("created_at", -1))

    def create_user(self, name: str, email: str, organisation: str) -> str:
        """Persist a lightweight onboarding profile; no password is collected in this demo."""
        result = self.db.users.update_one(
            {"email": email.lower().strip()},
            {"$set": {"name": name.strip(), "organisation": organisation.strip(), "updated_at": utcnow()},
             "$setOnInsert": {"created_at": utcnow()}},
            upsert=True,
        )
        return str(result.upserted_id or self.db.users.find_one({"email": email.lower().strip()})["_id"])

    def get_user_by_email(self, email: str) -> dict[str, Any] | None:
        """Return an existing onboarding profile for the demo sign-in flow."""
        return self.db.users.find_one({"email": email.lower().strip()})

    def create_api_user(self, name: str, email: str, organisation: str, password: str) -> dict[str, Any]:
        email = email.lower().strip()
        if self.get_user_by_email(email):
            raise ValueError("An account with that email already exists.")
        result = self.db.users.insert_one({"name": name.strip(), "email": email, "organisation": organisation.strip(), "password_hash": hash_password(password), "created_at": utcnow(), "updated_at": utcnow()})
        return self.db.users.find_one({"_id": result.inserted_id})

    def authenticate_api_user(self, email: str, password: str) -> dict[str, Any] | None:
        user = self.get_user_by_email(email)
        return user if user and verify_password(password, user.get("password_hash")) else None

    def update_api_user(self, user_id: str, name: str, email: str, organisation: str) -> dict[str, Any] | None:
        try:
            query = {"_id": ObjectId(user_id)}
        except Exception:
            return None
        self.db.users.update_one(query, {"$set": {"name": name.strip(), "email": email.lower().strip(), "organisation": organisation.strip(), "updated_at": utcnow()}})
        return self.db.users.find_one(query)

    def create_voice_session(self, user_id: str | None, document_id: str | None) -> str:
        result = self.db.voice_sessions.insert_one({"user_id": user_id, "document_id": document_id, "created_at": utcnow()})
        return str(result.inserted_id)

    def save_voice_transcript(self, voice_session_id: str, speaker: str, content: str) -> None:
        self.db.voice_transcripts.insert_one({
            "voice_session_id": voice_session_id,
            "speaker": speaker,
            "content": content,
            "created_at": utcnow(),
        })

    def get_voice_transcripts(self, voice_session_id: str) -> list[dict[str, Any]]:
        """Return a voice session as an ordered, displayable conversation."""
        return list(
            self.db.voice_transcripts.find({"voice_session_id": voice_session_id}, {"_id": 0})
            .sort("created_at", 1)
        )
