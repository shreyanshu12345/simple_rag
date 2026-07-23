import os
import math
from datetime import datetime
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Compute cosine similarity between two float vectors."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm_a = math.sqrt(sum(a * a for a in v1))
    norm_b = math.sqrt(sum(b * b for b in v2))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


class MongoDBManager:
    """MongoDB Atlas manager with session isolation and automated session cleanup."""

    def __init__(self):
        uri = os.getenv("MONGODB_URI", "")
        self.client = MongoClient(uri) if uri else None
        self.db_name = os.getenv("DB_NAME", "rag_db")
        self.collection_name = os.getenv("COLLECTION_NAME", "documents")
        self.vector_index_name = os.getenv("VECTOR_INDEX_NAME", "vector_index")

    @property
    def collection(self):
        if not self.client:
            uri = os.getenv("MONGODB_URI", "")
            if not uri:
                raise ValueError("MONGODB_URI is not set in environment.")
            self.client = MongoClient(uri)
        return self.client[self.db_name][self.collection_name]

    def is_connected(self) -> bool:
        """Check MongoDB connection status."""
        try:
            if self.client:
                self.client.admin.command('ping')
                return True
        except Exception:
            return False
        return False

    def save_chunks(self, chunks: List[Dict[str, Any]], embeddings: List[List[float]], session_id: str) -> int:
        """Insert document chunks, embeddings, and session_id into MongoDB."""
        now = datetime.utcnow().isoformat()
        docs = [
            {
                "session_id": session_id,
                "doc_name": c["doc_name"],
                "chunk_id": c["chunk_id"],
                "text": c["text"],
                "char_length": c["char_length"],
                "embedding": emb,
                "vector": emb,
                "created_at": now
            }
            for c, emb in zip(chunks, embeddings)
        ]
        result = self.collection.insert_many(docs)
        return len(result.inserted_ids)

    def search_similar_chunks(self, query_embedding: List[float], session_id: Optional[str] = None, top_k: int = 4) -> List[Dict[str, Any]]:
        """
        Search similar chunks strictly isolated by session_id.
        """
        # Try MongoDB Atlas $vectorSearch aggregation pipeline with session_id filter
        try:
            vector_search_stage = {
                "index": self.vector_index_name,
                "path": "embedding",
                "queryVector": query_embedding,
                "numCandidates": top_k * 10,
                "limit": top_k
            }
            if session_id:
                vector_search_stage["filter"] = {"session_id": session_id}

            pipeline = [
                {"$vectorSearch": vector_search_stage},
                {
                    "$project": {
                        "_id": {"$toString": "$_id"},
                        "doc_name": 1,
                        "chunk_id": 1,
                        "text": 1,
                        "char_length": 1,
                        "session_id": 1,
                        "score": {"$meta": "vectorSearchScore"}
                    }
                }
            ]
            results = list(self.collection.aggregate(pipeline))
            if results:
                return results
        except Exception as e:
            print(f"[MongoDB VectorSearch Info] Atlas $vectorSearch query failed ({e}). Running session-filtered cosine fallback.")

        # Fallback: Calculate cosine similarity in Python strictly for current session_id
        try:
            match_query = {"session_id": session_id} if session_id else {}
            all_docs = list(self.collection.find(match_query, {"embedding": 1, "vector": 1, "text": 1, "doc_name": 1, "chunk_id": 1, "char_length": 1, "session_id": 1}))
            scored = []
            for doc in all_docs:
                emb = doc.get("embedding") or doc.get("vector") or []
                score = cosine_similarity(query_embedding, emb)
                scored.append({
                    "_id": str(doc["_id"]),
                    "doc_name": doc.get("doc_name", "unknown"),
                    "chunk_id": doc.get("chunk_id", 0),
                    "text": doc.get("text", ""),
                    "char_length": doc.get("char_length", 0),
                    "score": float(score)
                })

            scored.sort(key=lambda x: x["score"], reverse=True)
            return scored[:top_k]
        except Exception as fallback_err:
            print(f"[MongoDB Fallback Error] {fallback_err}")
            return []

    def get_documents_summary(self, session_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get summary list of uploaded documents filtered by session_id."""
        match_stage = {"$match": {"session_id": session_id}} if session_id else {"$match": {}}
        pipeline = [
            match_stage,
            {
                "$group": {
                    "_id": "$doc_name",
                    "chunk_count": {"$sum": 1},
                    "total_chars": {"$sum": "$char_length"},
                    "uploaded_at": {"$first": "$created_at"}
                }
            },
            {
                "$project": {
                    "doc_name": "$_id",
                    "chunk_count": 1,
                    "total_chars": 1,
                    "uploaded_at": 1,
                    "_id": 0
                }
            }
        ]
        return list(self.collection.aggregate(pipeline))

    def delete_document(self, doc_name: str, session_id: Optional[str] = None) -> int:
        """Delete document chunks by name and session_id."""
        query = {"doc_name": doc_name}
        if session_id:
            query["session_id"] = session_id
        result = self.collection.delete_many(query)
        return result.deleted_count

    def delete_session_chunks(self, session_id: str) -> int:
        """Delete all document chunks associated with a specific session_id."""
        if not session_id:
            return 0
        result = self.collection.delete_many({"session_id": session_id})
        return result.deleted_count


# Global DB manager instance
db_manager = MongoDBManager()
