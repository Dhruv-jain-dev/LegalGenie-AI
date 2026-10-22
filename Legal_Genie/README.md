# Legal_Genie

## Streamlit application

The Streamlit frontend and FastAPI backend preserve the LegalGenie workspace flows: authentication, document uploads, conversations, summaries, drafting, voice prompts, history, and settings.

```powershell
python -m pip install -r requirements.txt
uvicorn backend:app --reload
```

In a second terminal:

```powershell
streamlit run streamlit_app.py
```

The local API seeds a demo account on first launch:

- Email: `alex.morgan@meridianlaw.co`
- Password: `demo`
