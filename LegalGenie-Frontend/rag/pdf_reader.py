from __future__ import annotations

from io import BytesIO
from typing import Any

from pypdf import PdfReader


def extract_pdf_text(file_bytes: bytes) -> str:
    """Extract readable text from a PDF upload, with useful validation errors."""
    try:
        reader = PdfReader(BytesIO(file_bytes))
    except Exception as exc:  # pypdf exposes several parsing exceptions
        raise ValueError("The uploaded file is not a readable PDF.") from exc

    pages = [(page.extract_text() or "").strip() for page in reader.pages]
    text = "\n\n".join(page for page in pages if page)
    if not text:
        raise ValueError("No selectable text was found. Try a text-based PDF (OCR is not included).")
    return text


def extract_pdf_pages(file_bytes: bytes) -> list[str]:
    """Return selectable text per page for API citation metadata."""
    try:
        reader = PdfReader(BytesIO(file_bytes))
    except Exception as exc:
        raise ValueError("The uploaded file is not a readable PDF.") from exc
    pages = [(page.extract_text() or "").strip() for page in reader.pages]
    if not any(pages):
        raise ValueError("No selectable text was found. Try a text-based PDF (OCR is not included).")
    return pages


def chunk_text(text: str, chunk_size: int = 900, overlap: int = 150) -> list[str]:
    """Split text on word boundaries while preserving short overlap for context."""
    if chunk_size <= overlap:
        raise ValueError("chunk_size must be greater than overlap")
    words = text.split()
    chunks: list[str] = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunks.append(" ".join(words[start:end]))
        if end == len(words):
            break
        start = end - overlap
    return chunks


def chunk_text_with_sources(
    text: str, page_texts: list[str], chunk_size: int = 900, overlap: int = 150
) -> tuple[list[str], list[dict[str, Any]]]:
    """Create the existing chunks plus page/snippet metadata for citations.

    A chunk beginning on a page is cited to that page. This intentionally keeps
    the original chunking and vector-store behaviour unchanged.
    """
    chunks = chunk_text(text, chunk_size, overlap)
    page_ends: list[int] = []
    total = 0
    for page in page_texts:
        total += len(page.split())
        page_ends.append(total)

    sources: list[dict[str, Any]] = []
    start = 0
    for chunk in chunks:
        page = next((index + 1 for index, end in enumerate(page_ends) if start < end), len(page_ends) or 1)
        sources.append({"page": page, "snippet": chunk[:320]})
        start += max(len(chunk.split()) - overlap, 1)
    return chunks, sources
