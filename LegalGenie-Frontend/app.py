from __future__ import annotations

import base64
import html
import json
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components
from dotenv import load_dotenv

from agents.draft_agent import create_draft
from agents.legal_agent import answer_question
from agents.router import route_request
from agents.summary_agent import summarize
from agents.voice_agent import answer_voice_question, transcribe_audio
from database.mongodb import MongoRepository
from rag.pdf_reader import chunk_text, extract_pdf_text
from rag.vector_store import LocalVectorStore

load_dotenv()
st.set_page_config(page_title="LegalGenie | Legal intelligence", page_icon="⚖️", layout="wide", initial_sidebar_state="collapsed")

LOGO_PATH = Path(__file__).parent / "assets" / "legalgenie-logo.png"


@st.cache_resource
def repository() -> MongoRepository:
    return MongoRepository()


@st.cache_resource
def vector_store() -> LocalVectorStore:
    return LocalVectorStore()


def logo_data_url() -> str:
    return "data:image/png;base64," + base64.b64encode(LOGO_PATH.read_bytes()).decode()


def styles() -> None:
    st.markdown("""<style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap');
    :root { --ink:#10283f; --ink-deep:#071b2e; --brass:#b08a4a; --brass-light:#d2b67d; --cream:#f7f4ed; --paper:#fffdfa; --line:#d8d0c1; --muted:#53616c; }
    .stApp { background: var(--cream); color: var(--ink); font-family:'DM Sans',sans-serif; }
    #MainMenu, footer, header { visibility:hidden; }
    .block-container { max-width:1200px; padding:1.3rem 2.4rem 2rem; }
    h1,h2,h3 { font-family:'Playfair Display',serif !important; color:var(--ink); }
    .brandbar { display:flex; align-items:center; gap:12px; padding:0 0 1.1rem; border-bottom:1px solid var(--line); }
    .brandbar img { width:42px; height:42px; border-radius:50%; } .brandbar b { font-family:'Playfair Display',serif; font-size:1.45rem; letter-spacing:.04em; }
    .brandbar span { color:var(--muted); font-size:.82rem; border-left:1px solid var(--line); padding-left:12px; }
    .hero { background:linear-gradient(125deg,#071b2e 0%,#102f4a 68%,#17425d 100%); border-radius:10px; padding:3.2rem; color:var(--paper); min-height:300px; box-shadow:0 12px 28px rgba(7,27,46,.12); }
    .eyebrow { color:var(--brass); text-transform:uppercase; letter-spacing:.16em; font-size:.72rem; font-weight:700; } .hero h1 { color:var(--paper); max-width:650px; font-size:3rem; margin:.55rem 0; } .hero p { max-width:590px; color:#e2e9ed; font-size:1.05rem; line-height:1.6; }
    .gold-rule { width:56px; height:3px; background:var(--brass); margin:1.4rem 0; }
    .feature { background:var(--paper); padding:1.3rem; min-height:148px; border:1px solid var(--line); border-radius:8px; } .feature h3 { font-size:1.16rem; margin:.4rem 0; } .feature p { font-size:.9rem; color:var(--muted); }
    /* Explicit widget colors prevent Streamlit's theme defaults from reducing contrast. */
    .stTextInput label, .stCheckbox label, .stCheckbox label span, [data-testid='stWidgetLabel'] p { color:var(--ink) !important; font-weight:600 !important; }
    .stTextInput input, .stChatInput textarea { background:var(--paper) !important; color:var(--ink) !important; border:1px solid #aab7c0 !important; border-radius:7px !important; caret-color:var(--ink) !important; }
    .stTextInput input::placeholder, .stChatInput textarea::placeholder { color:#6b7881 !important; opacity:1 !important; }
    .stTextInput input:focus, .stChatInput textarea:focus { border-color:var(--brass) !important; box-shadow:0 0 0 2px rgba(176,138,74,.2) !important; }
    .stCheckbox [data-baseweb='checkbox'] { border-color:var(--ink) !important; } .stCheckbox [data-baseweb='checkbox'][aria-checked='true'] { background:var(--ink) !important; }
    .stButton > button, .stFormSubmitButton > button { background:var(--ink) !important; color:var(--paper) !important; border:1px solid var(--ink) !important; border-radius:6px; font-weight:700; min-height:44px; letter-spacing:.01em; }
    .stButton > button *, .stFormSubmitButton > button * { color:var(--paper) !important; }
    .stButton > button:hover, .stFormSubmitButton > button:hover { background:#17425d !important; border-color:#17425d !important; color:white !important; }
    .stButton > button:disabled, .stFormSubmitButton > button:disabled { background:#71808c !important; border-color:#71808c !important; color:white !important; opacity:1 !important; }
    /* Workspace controls: light, compact, and legible. */
    [data-testid='stRadio'] { margin:.4rem 0 1.25rem; }
    [data-testid='stRadio'] label { background:var(--paper); border:1px solid var(--line); border-radius:999px; padding:.38rem .75rem; margin-right:.45rem; }
    [data-testid='stRadio'] label p, [data-testid='stRadio'] label span { color:var(--ink) !important; font-weight:600 !important; }
    [data-testid='stExpander'] { background:var(--paper); border:1px solid var(--line); border-radius:9px; overflow:hidden; }
    [data-testid='stExpander'] summary { background:#eef2f3; color:var(--ink) !important; font-weight:700; padding:.85rem 1.15rem; }
    [data-testid='stExpander'] summary span, [data-testid='stExpander'] summary p { color:var(--ink) !important; }
    [data-testid='stFileUploaderDropzone'] { background:#f8faf9 !important; border:1px dashed #9aabb5 !important; border-radius:8px !important; padding:1.15rem !important; }
    [data-testid='stFileUploaderDropzone'] span, [data-testid='stFileUploaderDropzone'] small { color:var(--muted) !important; }
    [data-testid='stFileUploaderDropzone'] button { background:var(--paper) !important; border:1px solid var(--ink) !important; color:var(--ink) !important; }
    [data-testid='stFileUploaderDropzone'] button * { color:var(--ink) !important; }
    [data-testid='stChatInput'] { background:var(--paper) !important; border:1px solid #aab7c0 !important; border-radius:9px !important; padding:.25rem !important; box-shadow:0 3px 12px rgba(7,27,46,.06); }
    [data-testid='stChatInput'] textarea { border:0 !important; box-shadow:none !important; }
    [data-testid='stChatInput'] button { background:var(--ink) !important; border-radius:6px !important; }
    [data-testid='stChatInput'] button svg { fill:white !important; }
    /* One high-contrast surface system for messages, composer, alerts, and voice dialog. */
    [data-testid='stChatMessage'] { background:var(--paper) !important; border:1px solid var(--line); border-radius:12px; margin:.7rem 0; padding:.65rem .85rem; box-shadow:0 4px 14px rgba(7,27,46,.04); }
    [data-testid='stChatMessage'] p, [data-testid='stChatMessage'] li, [data-testid='stChatMessage'] span, [data-testid='stChatMessage'] strong, [data-testid='stChatMessage'] em { color:var(--ink) !important; }
    [data-testid='stChatMessage'] [data-testid='stMarkdownContainer'] { color:var(--ink) !important; line-height:1.65; }
    [data-testid='stChatMessage']:has([data-testid='chatAvatarIcon-user']) { background:#edf3f5 !important; border-color:#cbd8dd; }
    [data-testid='stChatInput'] { background:var(--paper) !important; border:1px solid #9aabb5 !important; border-radius:12px !important; box-shadow:0 5px 18px rgba(7,27,46,.09) !important; }
    [data-testid='stChatInput'] textarea { background:transparent !important; color:var(--ink) !important; border:0 !important; box-shadow:none !important; }
    [data-testid='stChatInput'] textarea::placeholder { color:#60717c !important; opacity:1 !important; }
    [data-testid='stChatInput'] button { background:var(--ink) !important; border-radius:7px !important; }
    [data-testid='stAlert'] { background:#f1f5f6 !important; border:1px solid #b8c6cb !important; color:var(--ink) !important; border-radius:9px; }
    [data-testid='stAlert'] p, [data-testid='stAlert'] span { color:var(--ink) !important; }
    [data-testid='stDialog'] { background:var(--paper) !important; border:1px solid var(--line) !important; }
    [data-testid='stDialog'] h1, [data-testid='stDialog'] h2, [data-testid='stDialog'] h3, [data-testid='stDialog'] p, [data-testid='stDialog'] span { color:var(--ink) !important; }
    [data-testid='stDialog'] [data-testid='stAudioInput'] { background:#f4f7f7; border:1px solid #aab7c0; border-radius:10px; padding:.7rem; }
    /* The response area is a light dock rather than a dark overlay. */
    [data-testid='stBottom'] { background:linear-gradient(0deg,var(--cream) 72%,rgba(247,244,237,0)) !important; padding:1.5rem 2.4rem 1.2rem !important; }
    [data-testid='stBottom'] > div { max-width:1200px; margin:auto; }
    [data-testid='stChatInput'] { min-height:58px; border:1px solid #879ba6 !important; border-radius:15px !important; padding:.45rem .55rem !important; }
    [data-testid='stChatInput']:focus-within { border-color:var(--brass) !important; box-shadow:0 0 0 3px rgba(176,138,74,.16),0 8px 24px rgba(7,27,46,.1) !important; }
    .st-key-voice_consultation_button { width:fit-content !important; margin:1.1rem 0 .55rem auto; }
    .st-key-voice_consultation_button button { background:linear-gradient(135deg,#173d5a,#10283f) !important; border:1px solid #10283f !important; border-radius:999px !important; min-height:42px !important; padding:0 1.15rem !important; box-shadow:0 8px 18px rgba(7,27,46,.14); }
    .voice-assistant-stage { text-align:center; padding:.5rem .2rem .9rem; }.voice-assistant-orb { position:relative; width:92px; height:92px; margin:.4rem auto 1rem; border-radius:50%; background:radial-gradient(circle at 35% 30%,#f7e2ae 0%,#c79c4d 40%,#7b5926 100%); box-shadow:0 0 0 10px rgba(176,138,74,.12),0 0 0 22px rgba(176,138,74,.06),0 13px 30px rgba(7,27,46,.18); animation:voice-pulse 2s ease-in-out infinite; }.voice-assistant-orb::after { content:''; position:absolute; inset:27px; border:2px solid rgba(255,255,255,.72); border-radius:50%; }.voice-status { color:var(--brass); font-size:.74rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; }.voice-assistant-stage p { color:var(--muted) !important; margin:.35rem auto 0; font-size:.9rem; }.voice-turn-card { background:#f1f5f6; border:1px solid #d1dde0; border-radius:10px; padding:.75rem .9rem; margin:.65rem 0; color:var(--ink) !important; text-align:left; }.voice-turn-card b { color:var(--ink) !important; font-size:.78rem; letter-spacing:.05em; text-transform:uppercase; }.voice-turn-card p { color:var(--ink) !important; margin:.28rem 0 0; font-size:.9rem; line-height:1.5; }@keyframes voice-pulse { 0%,100% { transform:scale(1); box-shadow:0 0 0 10px rgba(176,138,74,.12),0 0 0 22px rgba(176,138,74,.06),0 13px 30px rgba(7,27,46,.18); } 50% { transform:scale(1.04); box-shadow:0 0 0 14px rgba(176,138,74,.1),0 0 0 30px rgba(176,138,74,.035),0 15px 34px rgba(7,27,46,.2); } }
    @media (max-width:700px) { [data-testid='stBottom'] { padding:1.1rem 1rem !important; } .st-key-voice_consultation_button { margin-top:.8rem; } }
    /* LegalGenie command-center layout. */
    .block-container { max-width:1380px; padding:1.15rem 2.2rem 2.5rem; }
    .brandbar { padding:.45rem 0 1rem; border:0; justify-content:space-between; }
    .brandbar .brand-identity { display:flex; align-items:center; gap:12px; }.brandbar .brand-identity img { width:38px; height:38px; border-radius:11px; }.brandbar .brand-identity b { font-size:1.28rem; }.brandbar .brand-identity span { border:0; padding:0; color:var(--muted); }
    .brand-nav { display:flex; gap:.45rem; align-items:center; }.brand-nav span { color:var(--muted); font-size:.78rem; font-weight:700; padding:.42rem .72rem; border-radius:999px; }.brand-nav span:first-child { color:var(--ink); background:#e9eff0; }
    .workspace-hero { position:relative; overflow:hidden; background:linear-gradient(115deg,#0a243a,#143d58 62%,#1c566d); border-radius:20px; padding:2rem 2.15rem; color:white; box-shadow:0 18px 38px rgba(7,27,46,.16); margin:.25rem 0 1.25rem; }.workspace-hero::after { content:''; position:absolute; width:380px; height:380px; border:1px solid rgba(214,183,126,.25); border-radius:50%; right:-120px; top:-230px; box-shadow:0 0 0 46px rgba(214,183,126,.05),0 0 0 92px rgba(214,183,126,.035); }.workspace-hero > * { position:relative; z-index:1; }.workspace-kicker { color:#dfc78f; text-transform:uppercase; letter-spacing:.16em; font-size:.7rem; font-weight:800; }.workspace-hero h1 { color:white; margin:.4rem 0 .45rem; font-size:clamp(2rem,3.5vw,3rem); }.workspace-hero p { color:#d7e4e9; max-width:39rem; line-height:1.55; margin:0; }.workspace-metrics { display:flex; gap:.6rem; flex-wrap:wrap; margin-top:1.2rem; }.workspace-metric { background:rgba(255,255,255,.11); border:1px solid rgba(255,255,255,.16); border-radius:10px; padding:.52rem .75rem; color:#f5f7f7; font-size:.78rem; }.workspace-metric b { color:#f0dca9; }
    .section-label { color:var(--muted); text-transform:uppercase; letter-spacing:.13em; font-size:.68rem; font-weight:800; margin:.2rem 0 .65rem; }.side-panel, .conversation-panel { background:var(--paper); border:1px solid var(--line); border-radius:16px; box-shadow:0 8px 24px rgba(7,27,46,.055); }.side-panel { padding:1.05rem; }.side-panel h3 { margin:.1rem 0 .25rem; font-size:1.25rem; }.side-panel p { color:var(--muted); font-size:.85rem; line-height:1.5; }.case-chip { display:flex; align-items:center; gap:.65rem; background:#edf3f4; border:1px solid #d4e0e2; border-radius:11px; padding:.75rem; margin:.85rem 0; }.case-chip-icon { width:31px; height:31px; display:grid; place-items:center; border-radius:9px; background:var(--ink); color:#f2d99c; }.case-chip b { display:block; color:var(--ink); font-size:.83rem; }.case-chip span { color:var(--muted); font-size:.74rem; }.workflow-step { display:flex; gap:.65rem; align-items:flex-start; margin:.8rem 0; }.step-number { flex:0 0 24px; height:24px; display:grid; place-items:center; border-radius:50%; background:#ecdfc2; color:#765620; font-size:.72rem; font-weight:800; }.workflow-step b { display:block; color:var(--ink); font-size:.82rem; }.workflow-step span { color:var(--muted); font-size:.75rem; }.side-panel [data-testid='stExpander'] { margin-top:.9rem; }
    .conversation-panel { padding:1.15rem 1.2rem .6rem; min-height:560px; }.conversation-top { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding-bottom:.9rem; border-bottom:1px solid var(--line); }.conversation-top h2 { margin:0; font-size:1.45rem; }.conversation-presence { display:flex; align-items:center; gap:.38rem; color:#497a63; font-size:.75rem; font-weight:700; }.conversation-presence::before { content:''; width:7px; height:7px; border-radius:50%; background:#58a778; box-shadow:0 0 0 4px rgba(88,167,120,.13); }.conversation-empty { display:grid; place-items:center; min-height:245px; text-align:center; padding:1rem; }.conversation-empty-icon { width:56px; height:56px; border-radius:18px; display:grid; place-items:center; margin:auto auto .8rem; font-size:1.55rem; background:linear-gradient(135deg,#e8dac0,#c59a50); }.conversation-empty h3 { margin:0 0 .35rem; }.conversation-empty p { margin:0; max-width:25rem; color:var(--muted); font-size:.9rem; line-height:1.55; }.composer-label { display:flex; justify-content:space-between; align-items:center; margin:1rem 0 .45rem; color:var(--muted); font-size:.76rem; font-weight:700; }.composer-label span:last-child { color:var(--brass); }.conversation-panel [data-testid='stChatInput'] { position:static !important; }.conversation-panel [data-testid='stChatMessage'] { margin:.75rem 0; }
    .st-key-voice_consultation_button { margin:.6rem 0 0 auto; }.st-key-voice_consultation_button button::before { content:'✦ '; color:#e8cf93; } .st-key-voice_consultation_button button { font-size:.82rem !important; }
    @media (max-width:850px) { .brand-nav { display:none; }.workspace-hero { padding:1.55rem; }.conversation-panel { min-height:auto; } }
    /* Final contrast guard: Streamlit widgets must never inherit stale dark-theme colors. */
    .stApp, .stApp [data-testid='stMain'], .stApp [data-testid='stMainBlockContainer'] { background:var(--cream) !important; color:var(--ink) !important; }
    [data-testid='stChatMessage'], [data-testid='stChatMessage'] *, [data-testid='stAlert'], [data-testid='stAlert'] *, [data-testid='stExpanderDetails'], [data-testid='stExpanderDetails'] * { color:var(--ink) !important; }
    [data-testid='stChatInput'], [data-testid='stChatInput'] textarea, [data-testid='stChatInput'] textarea:focus { background:var(--paper) !important; color:var(--ink) !important; }
    [data-testid='stChatInput'] textarea::placeholder { color:#53616c !important; }
    [data-testid='stDialog'], [data-testid='stDialog'] * { color:var(--ink) !important; }
    [data-testid='stDialog'] { background:var(--paper) !important; }
    /* Rebuilt application layout. */
    .stApp { background:linear-gradient(145deg,#f7f4ed 0%,#f1f4f3 48%,#f7f4ed 100%) !important; }
    .block-container { max-width:1360px; padding:1.5rem 2.4rem 9rem !important; }
    .brandbar { background:rgba(255,253,250,.9); border:1px solid rgba(216,208,193,.9); border-radius:18px; padding:.72rem 1rem; box-shadow:0 10px 28px rgba(7,27,46,.06); }
    .brandbar::after { content:'PRIVATE WORKSPACE'; margin-left:auto; color:var(--brass); font-size:.68rem; letter-spacing:.12em; font-weight:700; }
    .workspace-intro { display:flex; align-items:end; justify-content:space-between; gap:1.5rem; padding:2.1rem 0 1.35rem; }.workspace-intro h1 { margin:0; font-size:clamp(2.1rem,4vw,3.45rem); line-height:1; }.workspace-intro p { margin:.5rem 0 0; color:var(--muted); font-size:1rem; }.workspace-kicker { color:var(--brass); text-transform:uppercase; font-size:.7rem; letter-spacing:.15em; font-weight:700; }.profile-mark { display:flex; align-items:center; gap:.6rem; background:#10283f; color:#fffdfa; border-radius:999px; padding:.55rem .85rem; font-size:.82rem; box-shadow:0 8px 18px rgba(7,27,46,.14); }.profile-mark span { display:grid; place-items:center; width:1.45rem; height:1.45rem; background:var(--brass); color:var(--ink-deep); border-radius:50%; font-weight:800; }
    .workspace-rail, .conversation-canvas { background:rgba(255,253,250,.82); border:1px solid rgba(216,208,193,.95); border-radius:20px; box-shadow:0 14px 32px rgba(7,27,46,.055); }.workspace-rail { padding:1.1rem; }.rail-title { color:var(--ink); font-size:.78rem; font-weight:700; text-transform:uppercase; letter-spacing:.12em; margin:.1rem 0 .9rem; }.rail-note { color:var(--muted); font-size:.83rem; line-height:1.55; margin:.4rem 0 1rem; }.doc-status { background:#eef4f2; border:1px solid #d0ddd8; border-radius:12px; padding:.8rem; margin:.7rem 0 1rem; }.doc-status b { display:block; color:var(--ink); font-size:.87rem; }.doc-status span { color:var(--muted); font-size:.78rem; }.conversation-canvas { min-height:510px; padding:1.35rem 1.45rem 1.7rem; }.canvas-head { display:flex; justify-content:space-between; align-items:start; border-bottom:1px solid var(--line); padding-bottom:1rem; margin-bottom:.8rem; }.canvas-head h2 { font-size:1.55rem; margin:0; }.canvas-head p { color:var(--muted); font-size:.84rem; margin:.3rem 0 0; }.online-status { color:#2f7e5f; font-size:.72rem; letter-spacing:.1em; font-weight:700; text-transform:uppercase; }
    .empty-conversation { padding:3.3rem 1rem 2.3rem; text-align:center; }.empty-icon { display:grid; place-items:center; width:4.3rem; height:4.3rem; margin:0 auto 1rem; background:linear-gradient(145deg,#173d5a,#10283f); border-radius:18px; color:#f3d797; font-size:1.65rem; box-shadow:0 14px 28px rgba(7,27,46,.18); }.empty-conversation h2 { margin:0; font-size:2rem; }.empty-conversation p { max-width:31rem; color:var(--muted); margin:.6rem auto 1.3rem; line-height:1.6; }.quick-label { color:var(--muted); font-size:.76rem; font-weight:700; text-transform:uppercase; letter-spacing:.1em; margin-bottom:.5rem; }[class*='st-key-quick_'] button { background:#fffdfa !important; color:var(--ink) !important; border:1px solid var(--line) !important; border-radius:10px !important; text-align:left; min-height:48px !important; box-shadow:none !important; }[class*='st-key-quick_'] button:hover { background:#eef4f2 !important; border-color:#9bb5ae !important; }
    .st-key-voice_consultation_button { margin:.8rem 0 0 auto; }.st-key-voice_consultation_button button { background:#fffdfa !important; color:var(--ink) !important; border:1px solid #9bb5ae !important; box-shadow:none !important; }.st-key-voice_consultation_button button:hover { background:#eef4f2 !important; }
    [data-testid='stChatMessage'] { box-shadow:none; }.workspace-rail [data-testid='stFileUploaderDropzone'] { padding:.8rem !important; }.workspace-rail [data-testid='stFileUploaderDropzone'] button { min-height:36px !important; }
    @media (max-width:800px) { .block-container { padding:1rem 1rem 8rem !important; }.workspace-intro { align-items:start; flex-direction:column; padding:1.45rem 0 1rem; }.brandbar::after { display:none; }.conversation-canvas { padding:1rem; } }
    </style>""", unsafe_allow_html=True)


def initialise() -> None:
    for key, value in {"document_id": None, "session_id": None, "user_id": None, "user_name": None, "voice_session_id": None, "mode": "Workspace"}.items():
        st.session_state.setdefault(key, value)


def header() -> None:
    st.markdown(f'<div class="brandbar"><img src="{logo_data_url()}"><b>LEGALGENIE</b><span>Private legal intelligence · New York</span></div>', unsafe_allow_html=True)


def signup(repo: MongoRepository) -> None:
    header()
    left, right = st.columns([1.25, .75], gap="large")
    with left:
        st.markdown("""<section class="hero"><div class="eyebrow">New York · private legal intelligence</div><h1>Clarity for every legal decision.</h1><div class="gold-rule"></div><p>Securely review documents, focus the right questions, and prepare your next step with the discretion your practice demands.</p></section>""", unsafe_allow_html=True)
        cols = st.columns(3)
        for col, icon, title, text in zip(cols, ["◈", "◌", "⌁"], ["Document insight", "Confidential by design", "Voice consultations"], ["Turn dense files into clear action.", "Your workspace stays focused and protected.", "Speak naturally in a dedicated private mode."]):
            with col: st.markdown(f'<div class="feature"><div class="eyebrow">{icon}</div><h3>{title}</h3><p>{text}</p></div>', unsafe_allow_html=True)
    with right:
        st.markdown("## Begin your workspace\nCreate a profile or return to an existing workspace.")
        auth_mode = st.radio("Account access", ["Create account", "Sign in"], horizontal=True, label_visibility="collapsed")
        if auth_mode == "Create account":
            with st.form("signup"):
                name = st.text_input("Full name", placeholder="Aarav Mehta")
                email = st.text_input("Work email", placeholder="aarav@firm.com")
                organisation = st.text_input("Firm or organisation", placeholder="Mehta Legal")
                agreed = st.checkbox("I understand LegalGenie provides legal information, not legal advice.")
                submitted = st.form_submit_button("Create secure workspace", use_container_width=True)
            if submitted:
                if not name or not email or "@" not in email or not agreed:
                    st.error("Please enter your name, a valid work email, and accept the notice.")
                else:
                    st.session_state.user_id = repo.create_user(name, email, organisation)
                    st.session_state.user_name = name
                    st.rerun()
        else:
            with st.form("signin"):
                email = st.text_input("Work email", placeholder="aarav@firm.com")
                submitted = st.form_submit_button("Open workspace", use_container_width=True)
            if submitted:
                user = repo.get_user_by_email(email) if email and "@" in email else None
                if not user:
                    st.error("We could not find a workspace for that email. Create an account to get started.")
                else:
                    st.session_state.user_id = str(user["_id"])
                    st.session_state.user_name = user["name"]
                    st.rerun()


def upload_document(repo: MongoRepository, store: LocalVectorStore, file) -> None:
    content = file.getvalue(); text = extract_pdf_text(content); chunks = chunk_text(text)
    document_id = repo.create_document(file.name, content, text, chunks, "")
    repo.update_document_index_path(document_id, store.create(document_id, chunks))
    st.session_state.document_id = document_id; st.session_state.session_id = repo.create_session(file.name, document_id)


def speak(text: str) -> None:
    spoken_text = json.dumps(text).replace("</", "<\\/")
    components.html(f"<script>window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance({spoken_text}));</script>", height=0)


def voice_mode(repo: MongoRepository, store: LocalVectorStore) -> None:
    """Run a compact, turn-by-turn voice room with an assistant-style interface."""
    open_key = "legal_voice_room_open"
    if st.button("Voice consultation", key="voice_consultation_button"):
        st.session_state[open_key] = True
        if not st.session_state.voice_session_id:
            st.session_state.voice_session_id = repo.create_voice_session(st.session_state.user_id, st.session_state.document_id)
        if not st.session_state.get("legal_voice_welcome_saved"):
            welcome = "Hello, I am LegalGenie. Tell me what you would like to understand, review, or prepare."
            repo.save_voice_transcript(st.session_state.voice_session_id, "assistant", welcome)
            st.session_state.legal_voice_welcome_saved = True
            st.session_state.legal_voice_reply = welcome
        st.rerun()
    if not st.session_state.get(open_key):
        return

    @st.dialog("Voice consultation", width="small", on_dismiss="rerun")
    def voice_room() -> None:
        pending_reply = st.session_state.pop("legal_voice_reply", None)
        status = "Speaking" if pending_reply else "Ready to listen"
        st.markdown(
            f"<div class='voice-assistant-stage'><div class='voice-assistant-orb'></div>"
            f"<div class='voice-status'>{status}</div>"
            "<p>Tap the microphone, speak naturally, and LegalGenie will reply aloud.</p></div>",
            unsafe_allow_html=True,
        )
        if pending_reply:
            speak(pending_reply)
        if st.session_state.get("legal_voice_last_question"):
            st.markdown("<div class='voice-turn-card'><b>You said</b><p>" + html.escape(st.session_state.legal_voice_last_question) + "</p></div>", unsafe_allow_html=True)
        if st.session_state.get("legal_voice_last_response"):
            st.markdown("<div class='voice-turn-card'><b>LegalGenie</b><p>" + html.escape(st.session_state.legal_voice_last_response) + "</p></div>", unsafe_allow_html=True)

        recording_number = st.session_state.get("legal_voice_recording_number", 0)
        recording = st.audio_input(
            "Speak your question",
            key=f"legal_voice_capture_{recording_number}",
            label_visibility="collapsed",
        )
        if recording:
            try:
                with st.spinner("Listening..."):
                    transcript = transcribe_audio(recording.getvalue(), recording.name or "legal-question.wav")
                    if transcript.startswith("Voice transcription is unavailable"):
                        st.warning(transcript)
                        return
                    repo.save_voice_transcript(st.session_state.voice_session_id, "user", transcript)
                    document = repo.get_document(st.session_state.document_id) if st.session_state.document_id else None
                    context = store.search(str(document["_id"]), document["chunks"], transcript) if document else []
                    response = answer_voice_question(transcript, context)
                    repo.save_voice_transcript(st.session_state.voice_session_id, "assistant", response)
                st.session_state.legal_voice_reply = response
                st.session_state.legal_voice_last_question = transcript
                st.session_state.legal_voice_last_response = response
                st.session_state.legal_voice_recording_number = recording_number + 1
                st.rerun()
            except Exception as exc:
                st.error(f"We could not process that recording: {exc}")
        if st.button("End voice consultation", use_container_width=True):
            st.session_state[open_key] = False
            st.rerun()

    voice_room()


def workspace(repo: MongoRepository, store: LocalVectorStore) -> None:
    header()
    user_name = st.session_state.user_name or "Counsel"
    first_name = user_name.split()[0]
    document = repo.get_document(st.session_state.document_id) if st.session_state.document_id else None
    document_name = document["name"] if document else "No document selected"
    st.markdown(
        f"""<section class='workspace-intro'><div><div class='workspace-kicker'>Legal intelligence workspace</div>
        <h1>Welcome back, {first_name}.</h1><p>A calm, focused place for your documents, questions, and next steps.</p></div>
        <div class='profile-mark'><span>{first_name[0].upper()}</span>{user_name}</div></section>""",
        unsafe_allow_html=True,
    )
    rail, canvas = st.columns([0.9, 2.1], gap="large")
    with rail:
        with st.container(border=True):
            st.markdown("<div class='rail-title'>Case materials</div><p class='rail-note'>Keep a document attached to give LegalGenie the context behind every response.</p>", unsafe_allow_html=True)
            uploaded = st.file_uploader("Add a legal PDF", type=["pdf"], label_visibility="collapsed")
            if uploaded and st.button("Analyse document", use_container_width=True):
                with st.spinner("Preparing your secure document workspace…"):
                    upload_document(repo, store, uploaded)
                st.success("Document ready for analysis.")
            st.markdown(f"<div class='doc-status'><b>{document_name}</b><span>{'Context connected' if document else 'Add a PDF to ground answers in your material'}</span></div>", unsafe_allow_html=True)
            st.markdown("<div class='rail-title' style='margin-top:1.3rem;'>Talk it through</div><p class='rail-note'>Use a private, spoken turn-by-turn conversation when typing is not convenient.</p>", unsafe_allow_html=True)
            voice_mode(repo, store)
            st.button("Start a new conversation", key="new_conversation", use_container_width=True, on_click=lambda: st.session_state.update(session_id=None))
    if not st.session_state.session_id:
        st.session_state.session_id = repo.create_session("LegalGenie chat", st.session_state.document_id)
    messages = repo.get_messages(st.session_state.session_id)
    with canvas:
        with st.container(border=True):
            st.markdown(f"<div class='canvas-head'><div><h2>Conversation</h2><p>{document_name}</p></div><div class='online-status'>● LegalGenie online</div></div>", unsafe_allow_html=True)
            if not messages:
                st.markdown("<div class='empty-conversation'><div class='empty-icon'>⚖</div><h2>What would you like to work through?</h2><p>Ask a question, get an overview, or start a draft. LegalGenie will keep the response practical and easy to follow.</p><div class='quick-label'>Start with a prompt</div></div>", unsafe_allow_html=True)
                quick_one, quick_two = st.columns(2, gap="small")
                with quick_one:
                    if st.button("Summarise this document", key="quick_summary", use_container_width=True):
                        st.session_state.pending_prompt = "Please summarise the key points and obligations in this document."
                with quick_two:
                    if st.button("Explain a clause", key="quick_clause", use_container_width=True):
                        st.session_state.pending_prompt = "Help me understand the most important clauses and risks in this document."
                quick_three, quick_four = st.columns(2, gap="small")
                with quick_three:
                    if st.button("Prepare a draft", key="quick_draft", use_container_width=True):
                        st.session_state.pending_prompt = "Help me prepare a professional legal draft based on my situation."
                with quick_four:
                    if st.button("Identify next steps", key="quick_steps", use_container_width=True):
                        st.session_state.pending_prompt = "What should I do next based on this document?"
            else:
                for message in messages:
                    with st.chat_message(message["role"], avatar="⚖️" if message["role"] == "assistant" else "👤"):
                        st.markdown(message["content"])
    submission = st.chat_input(
        "Ask about a clause, request a summary, or prepare a draft...",
        accept_audio=True,
        audio_sample_rate=16000,
        key=f"legal_chat_{st.session_state.session_id}",
    )
    prompt = st.session_state.pop("pending_prompt", "")
    if submission:
        prompt = submission.text.strip()
    if submission and submission.audio:
        try:
            with st.spinner("Transcribing your voice prompt..."):
                prompt = transcribe_audio(submission.audio.getvalue(), submission.audio.name or "legal-question.wav")
        except Exception as exc:
            st.error(f"We could not transcribe that recording: {exc}")
            return
    if not prompt:
        return
    agent = route_request(prompt); repo.add_message(st.session_state.session_id, "user", prompt, agent)
    with st.chat_message("user", avatar="👤"): st.markdown(prompt)
    document = repo.get_document(st.session_state.document_id) if st.session_state.document_id else None
    with st.chat_message("assistant", avatar="⚖️"):
        with st.spinner("Preparing a careful response…"):
            if agent == "summary":
                response = summarize(document["extracted_text"] if document else "No document uploaded.")
                if document: repo.save_summary(str(document["_id"]), response)
            else:
                context = store.search(str(document["_id"]), document["chunks"], prompt) if document else []
                response = create_draft(prompt, context) if agent == "draft" else answer_question(prompt, context)
            st.markdown(response)
    repo.add_message(st.session_state.session_id, "assistant", response, agent)
    st.rerun()


def main() -> None:
    styles(); initialise()
    try: repo = repository()
    except Exception as exc:
        st.error(f"Could not connect to the secure workspace: {exc}"); st.stop()
    if not st.session_state.user_id: signup(repo)
    else: workspace(repo, vector_store())


if __name__ == "__main__": main()
