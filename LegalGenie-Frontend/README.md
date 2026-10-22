# LegalGenie AI

A Python and Streamlit agentic legal-document assistant. It uses the Gemini API, processes PDF documents, stores the original PDF and all application data in MongoDB, creates a local FAISS search index, and routes requests to question-answering, summarisation, or drafting agents.

## What is stored where?

| Data | Storage |
| --- | --- |
| Uploaded PDF bytes | MongoDB GridFS (`fs.files` / `fs.chunks`) |
| Filename, extracted text, chunks and vector-index metadata | MongoDB `documents` |
| Chats and messages | MongoDB `sessions`, `messages` |
| Generated summaries and drafts | MongoDB `summaries`, `drafts` |
| FAISS vector index | Local `data/faiss/` (the path is saved with the MongoDB document record) |

FAISS is intentionally local: it is an on-disk vector index. MongoDB remains the source of truth for all document and app data.

## Setup

```powershell
cd legalgenie_ai
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `.env` with your MongoDB Atlas connection string and Gemini API key, then run:

```powershell
streamlit run app.py
```

## React API

The production API is a thin FastAPI adapter over the existing repository, RAG,
agents, and voice transcription modules. Add a long random
`LEGALGENIE_API_AUTH_SECRET` and optional comma-separated `LEGALGENIE_CORS_ORIGINS`
to `.env`, then run:

```powershell
uvicorn api:app --reload --port 8000
```

The React app should use `VITE_API_BASE_URL` (for example,
`http://127.0.0.1:8000`) as its configurable API base URL.

Legacy Streamlit-onboarded users do not have passwords. After MongoDB is
reachable, an administrator can set one locally without exposing it in command
history:

```powershell
.\venv\Scripts\python.exe scripts\set_legacy_password.py user@example.com
```

## MongoDB Atlas

1. Create a free MongoDB Atlas cluster.
2. Create a database user and allow your current IP address in Network Access.
3. Copy the Python driver connection string into `MONGODB_URI` in `.env`.
4. Keep `.env` private; it is excluded from Git.

## Run tests

```powershell
pytest
```

## Important

This project offers general legal information and draft templates only. It is not legal advice and should always be reviewed by a qualified lawyer.
## Voice transcription

Voice prompts and the dedicated voice consultation screen use ElevenLabs Scribe v2. Add `ELEVENLABS_API_KEY` to `.env` before starting the app. Voice transcripts are stored in the `voice_transcripts` MongoDB collection and are deliberately not displayed in the voice interface.
