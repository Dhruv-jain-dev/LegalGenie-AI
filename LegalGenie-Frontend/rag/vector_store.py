from __future__ import annotations

import hashlib
from pathlib import Path

import faiss
import numpy as np


class LocalVectorStore:
    """Dependency-light FAISS retrieval using deterministic hashed embeddings.

    This keeps the project usable without an embedding API. The source chunks and
    index metadata remain traceable in MongoDB; replace ``_embed`` with a hosted
    embedding model later if semantic quality is required.
    """

    dimension = 512

    def __init__(self, index_dir: str = "data/faiss") -> None:
        self.index_dir = Path(index_dir)
        self.index_dir.mkdir(parents=True, exist_ok=True)

    def _embed(self, text: str) -> np.ndarray:
        vector = np.zeros(self.dimension, dtype="float32")
        for word in text.lower().split():
            digest = hashlib.blake2b(word.encode("utf-8"), digest_size=8).digest()
            vector[int.from_bytes(digest, "big") % self.dimension] += 1.0
        norm = np.linalg.norm(vector)
        return vector / norm if norm else vector

    def create(self, document_id: str, chunks: list[str]) -> str:
        index = faiss.IndexFlatIP(self.dimension)
        vectors = np.vstack([self._embed(chunk) for chunk in chunks])
        index.add(vectors)
        path = self.index_dir / f"{document_id}.faiss"
        faiss.write_index(index, str(path))
        return str(path)

    def search(self, document_id: str, chunks: list[str], query: str, limit: int = 4) -> list[str]:
        return [item["content"] for item in self.search_with_metadata(document_id, chunks, query, limit)]

    def search_with_metadata(self, document_id: str, chunks: list[str], query: str, limit: int = 4) -> list[dict[str, float | int | str]]:
        """Return existing retrieval results together with their chunk positions."""
        path = self.index_dir / f"{document_id}.faiss"
        if not path.exists() or not chunks:
            return []
        index = faiss.read_index(str(path))
        scores, positions = index.search(np.array([self._embed(query)]), min(limit, len(chunks)))
        return [
            {"content": chunks[int(position)], "index": int(position), "score": float(score)}
            for position, score in zip(positions[0], scores[0])
            if position >= 0 and score > 0
        ]
