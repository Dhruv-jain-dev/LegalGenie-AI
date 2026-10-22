"""Streamlit frontend for LegalGenie."""
from __future__ import annotations

import os
from typing import Any

import requests
import streamlit as st

API_URL = os.getenv("LEGALGENIE_API_URL", "http://127.0.0.1:8000")
st.set_page_config(page_title="LegalGenie AI", page_icon="⚖️", layout="wide", initial_sidebar_state="expanded")

st.markdown("""
<style>
  .stApp { background:#f8fafc; color:#172033; }
  h1,h2,h3 { color:#172033; letter-spacing:-.02em; }
  .hero { padding:5rem 1rem 3rem; text-align:center; background:linear-gradient(180deg,#eff6ff 0%,#f8fafc 100%); border-radius:24px; }
  .hero h1 { font-size:3.4rem; margin-bottom:.5rem; } .hero span { color:#2563eb; }
  .card { background:white; border:1px solid #e5e7eb; border-radius:16px; padding:1.25rem; min-height:170px; }
  .muted { color:#64748b; } .pill { color:#1d4ed8; background:#dbeafe; border-radius:999px; padding:.35rem .7rem; font-size:.85rem; font-weight:600; display:inline-block; }
  [data-testid="stSidebar"] { background:#fff; border-right:1px solid #e5e7eb; }
</style>""", unsafe_allow_html=True)


def api(method: str, path: str, **kwargs: Any) -> Any:
    try:
        response = requests.request(method, f"{API_URL}{path}", timeout=20, **kwargs)
        if not response.ok:
            raise RuntimeError(response.json().get("detail", response.text))
        return response.json()
    except requests.RequestException as exc:
        st.error(f"Backend unavailable: {exc}. Start the API with `uvicorn backend:app --reload`.")
        st.stop()


def disclaimer() -> None:
    st.caption("LegalGenie provides general legal information and is not a substitute for professional legal advice.")


def login_page() -> None:
    st.markdown("<div class='hero'><div class='pill'>AI-Powered Legal Document Assistant</div><h1>LegalGenie <span>AI</span></h1><p class='muted'>Understand legal documents. Faster. Smarter.</p></div>", unsafe_allow_html=True)
    left, right = st.columns(2)
    with left:
        st.subheader("Sign in")
        with st.form("login"):
            email = st.text_input("Work email", value="alex.morgan@meridianlaw.co")
            password = st.text_input("Password", type="password", value="demo")
            if st.form_submit_button("Sign in", use_container_width=True):
                try:
                    st.session_state.user = api("POST", "/auth/login", json={"email": email, "password": password})
                    st.rerun()
                except RuntimeError as exc: st.error(str(exc))
    with right:
        st.subheader("Create your workspace")
        with st.form("signup"):
            name = st.text_input("Full name")
            organisation = st.text_input("Organisation")
            email = st.text_input("Email", key="signup_email")
            password = st.text_input("Password", type="password", key="signup_password")
            if st.form_submit_button("Get started", use_container_width=True):
                try:
                    st.session_state.user = api("POST", "/auth/signup", json={"name": name, "organisation": organisation, "email": email, "password": password})
                    st.rerun()
                except RuntimeError as exc: st.error(str(exc))
    disclaimer()


def landing() -> None:
    st.markdown("<div class='hero'><div class='pill'>✦ AI-Powered Legal Document Assistant</div><h1>Understand Legal Documents.<br><span>Faster. Smarter.</span></h1><p class='muted'>Upload legal documents, ask questions, generate summaries, prepare drafts, and interact with your documents using AI.</p></div>", unsafe_allow_html=True)
    if st.button("Start Using LegalGenie", type="primary"):
        st.session_state.show_auth = True; st.rerun()
    st.subheader("Everything you need to work with legal documents")
    features = [("📄", "Document Intelligence", "Upload and analyse legal PDFs with AI-powered text extraction and indexing."), ("💬", "AI Legal Q&A", "Ask questions and receive answers grounded in your uploaded documents."), ("✦", "Smart Summaries", "Turn lengthy legal documents into understandable, structured summaries."), ("✎", "Drafting Assistant", "Generate initial notices, agreements, letters and clauses in seconds."), ("🎙", "Voice Consultation", "Speak naturally and receive AI-generated general legal information."), ("◷", "Conversation History", "Continue previous legal discussions from your workspace anytime.")]
    for row in [features[:3], features[3:]]:
        cols = st.columns(3)
        for col, (icon, title, text) in zip(cols, row):
            with col: st.markdown(f"<div class='card'><h3>{icon} {title}</h3><p class='muted'>{text}</p></div>", unsafe_allow_html=True)
    st.subheader("How it works")
    cols = st.columns(4)
    for col, (number, title, text) in zip(cols, [("01", "Upload", "Upload a legal PDF."), ("02", "Analyse", "LegalGenie indexes it."), ("03", "Ask", "Request answers, summaries or drafts."), ("04", "Understand", "Receive document-grounded responses.")]):
        with col: st.markdown(f"<div class='card'><div class='pill'>{number}</div><h3>{title}</h3><p class='muted'>{text}</p></div>", unsafe_allow_html=True)
    disclaimer()


def dashboard() -> None:
    docs, convs, summaries, drafts = (api("GET", endpoint) for endpoint in ["/documents", "/conversations", "/summaries", "/drafts"])
    st.title("Good morning, " + st.session_state.user["name"].split()[0])
    st.caption("Here's an overview of your legal workspace.")
    cols = st.columns(4)
    for col, title, value in zip(cols, ["Documents analysed", "Conversations", "Summaries", "Drafts"], [sum(d["status"] == "analysed" for d in docs), len(convs), len(summaries), len(drafts)]):
        col.metric(title, value)
    st.subheader("Recent documents")
    st.dataframe(docs[:5], use_container_width=True, hide_index=True)
    disclaimer()


def documents_page() -> None:
    st.title("Document Library"); st.caption("Upload, analyse and manage your legal documents.")
    upload = st.file_uploader("Upload legal PDF", type=["pdf", "doc", "docx"])
    if upload and st.button("Upload document", type="primary"):
        with st.spinner("Extracting text and building the search index..."):
            api("POST", "/documents/upload", files={"file": (upload.name, upload.getvalue(), upload.type)})
        st.success("Document uploaded and analysed."); st.rerun()
    docs = api("GET", "/documents")
    search = st.text_input("Search documents")
    filtered = [doc for doc in docs if search.lower() in doc["name"].lower()]
    for doc in filtered:
        c1, c2, c3, c4 = st.columns([4, 2, 2, 1])
        c1.markdown(f"**{doc['name']}**  \\n+{doc['type']} · {doc['pages']} pages · {doc['size']}")
        c2.write(doc["uploadedAt"]); c3.write(doc["status"].title())
        if c4.button("Delete", key=f"delete-{doc['id']}"):
            api("DELETE", f"/documents/{doc['id']}"); st.rerun()
    disclaimer()


def chat_page() -> None:
    st.title("LegalGenie AI"); st.caption("Document-grounded AI")
    conversations = api("GET", "/conversations")
    names = {f"{c['title']} — {c['documentName']}": c for c in conversations}
    selected_name = st.selectbox("Conversation", ["Start a new conversation"] + list(names))
    if selected_name == "Start a new conversation":
        docs = api("GET", "/documents")
        doc_name = st.selectbox("Document", [d["name"] for d in docs])
        if st.button("New conversation", type="primary"):
            new = api("POST", "/conversations", json={"title": "New Conversation", "document_name": doc_name})
            st.session_state.selected_conversation = new["id"]; st.rerun()
        return
    conv = names[selected_name]
    for message in conv["messages"]:
        with st.chat_message("assistant" if message["role"] == "assistant" else "user"):
            st.write(message["content"])
            for source in message.get("sources", []): st.caption(f"Source: {source['document']} · page {source['page']}")
    question = st.chat_input(f"Ask about {conv['documentName']}")
    if question:
        with st.chat_message("user"): st.write(question)
        with st.chat_message("assistant"):
            with st.spinner("Reviewing relevant clauses..."):
                response = api("POST", f"/conversations/{conv['id']}/question", json={"question": question})
            st.write(response["content"]); st.caption(f"Source: {response['sources'][0]['document']} · page {response['sources'][0]['page']}")
        st.rerun()


def summaries_page() -> None:
    st.title("Document Summaries"); st.caption("AI-generated summaries of your legal documents with key terms, obligations and risks.")
    docs = api("GET", "/documents")
    with st.expander("Generate a new summary"):
        name = st.selectbox("Document", [d["name"] for d in docs], key="summary_doc")
        if st.button("Generate summary", type="primary"):
            api("POST", "/summaries", json={"document_name": name}); st.rerun()
    for summary in api("GET", "/summaries"):
        with st.expander(f"{summary['documentName']} · {summary['generatedAt']}"):
            st.write(summary["preview"])
            for section in summary["sections"]: st.markdown(f"**{section['title']}**\n\n{section['content']}")
    disclaimer()


def drafts_page() -> None:
    st.title("Drafting Assistant"); st.caption("Create an initial legal draft based on your instructions.")
    docs = api("GET", "/documents")
    with st.form("draft_form"):
        draft_type = st.selectbox("Document type", ["legal_notice", "agreement", "formal_letter", "contract_clause", "response_letter", "other"])
        context = st.text_area("What would you like to draft?", placeholder="Describe the facts, purpose and desired outcome.")
        related = st.selectbox("Related document (optional)", [""] + [d["name"] for d in docs])
        instructions = st.text_area("Additional instructions (optional)")
        submitted = st.form_submit_button("Generate draft", type="primary")
    if submitted:
        draft = api("POST", "/drafts", json={"type": draft_type, "context": context, "related_document": related or None, "additional_instructions": instructions})
        st.session_state.latest_draft = draft
    for draft in ([st.session_state.latest_draft] if "latest_draft" in st.session_state else []) + api("GET", "/drafts"):
        with st.expander(draft["title"], expanded=draft == st.session_state.get("latest_draft")):
            st.text_area("Draft", draft["content"], height=360, key=f"draft-{draft['id']}")
    disclaimer()


def voice_page() -> None:
    st.title("Voice Consultation"); st.caption("Speak naturally or type a question for general legal information.")
    question = st.text_area("Your question", placeholder="For example: What should I consider before signing this lease?")
    if st.button("Ask LegalGenie", type="primary") and question:
        with st.spinner("Preparing a response..."):
            st.success(api("POST", "/voice", json={"question": question})["content"])
    disclaimer()


def history_page() -> None:
    st.title("Conversation History")
    for convo in api("GET", "/conversations"):
        with st.expander(f"{convo['title']} · {convo['documentName']}"):
            st.caption(f"Last active: {convo['lastActive']}")
            st.write(f"{len(convo['messages'])} messages")
            if st.button("Delete conversation", key=f"conv-{convo['id']}"):
                api("DELETE", f"/conversations/{convo['id']}"); st.rerun()
    disclaimer()


def settings_page() -> None:
    st.title("Settings")
    user = st.session_state.user
    with st.form("profile"):
        name = st.text_input("Full name", user["name"]); email = st.text_input("Work email", user["email"]); organisation = st.text_input("Organisation", user["organisation"])
        if st.form_submit_button("Save changes", type="primary"):
            st.session_state.user = api("PUT", f"/users/{user['id']}", json={"name": name, "email": email, "organisation": organisation}); st.success("Profile saved.")
    st.subheader("Preferences")
    st.toggle("Email notifications", value=True); st.toggle("Enable voice input", value=True)
    st.subheader("Legal & Privacy")
    st.warning("LegalGenie provides general legal information and drafting assistance. It does not provide professional legal advice.")
    if st.button("Log out"):
        del st.session_state.user; st.rerun()
    disclaimer()


def workspace() -> None:
    with st.sidebar:
        st.markdown("## ⚖️ LegalGenie AI")
        st.caption(st.session_state.user["organisation"])
        page = st.radio("Workspace", ["Dashboard", "Documents", "Chat", "Summaries", "Drafts", "Voice", "History", "Settings"], label_visibility="collapsed")
    {"Dashboard": dashboard, "Documents": documents_page, "Chat": chat_page, "Summaries": summaries_page, "Drafts": drafts_page, "Voice": voice_page, "History": history_page, "Settings": settings_page}[page]()


if "user" not in st.session_state:
    if st.session_state.get("show_auth"): login_page()
    else: landing()
else:
    workspace()
