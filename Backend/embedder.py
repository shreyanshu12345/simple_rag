from typing import List
from sentence_transformers import SentenceTransformer


class EmbeddingService:
    """Sentence Transformers Embedding Service using all-MiniLM-L6-v2."""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model = SentenceTransformer(model_name)

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Embed a list of strings into 384d vector arrays."""
        if not texts:
            return []
        embeddings = self.model.encode(texts, show_progress_bar=False, convert_to_numpy=True)
        return [emb.tolist() for emb in embeddings]

    def embed_query(self, query: str) -> List[float]:
        """Embed a single query string."""
        return self.embed_texts([query])[0]


# Global embedder instance
embedder = EmbeddingService()
