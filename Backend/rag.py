import os
import requests
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from embedder import embedder
from db import db_manager
from span import spanTracing
import uuid



load_dotenv()


class RAGPipeline:
    """RAG pipeline integrating session-isolated MongoDB vector search with Auto Router LLM completion."""

    def answer_query(self, query: str, session_id: Optional[str] = None, top_k: int = 4) -> Dict[str, Any]:
        # ── Child span 1: top-k retrieval ────────────────────────────────────
        req_id = str(uuid.uuid4())
        with spanTracing("retrieval", req_id) as retrieval_span:
            query_vec = embedder.embed_query(query)
            chunks = db_manager.search_similar_chunks(query_vec, session_id=session_id, top_k=top_k)
            retrieval_span.set_metadata("k", len(chunks))

        if not chunks:
            return {
                "answer": "No relevant documents found matching your query in your current session's knowledge base.",
                "sources": [],
                "query": query
            }

        # Build context prompt
        context_str = "\n\n".join([
            f"[Doc: {c['doc_name']} | Chunk #{c['chunk_id']}]\n{c['text']}"
            for c in chunks
        ])

        api_key = os.getenv("AUTOROUTER_API_KEY", "").strip()
        base_url = os.getenv("AUTOROUTER_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
        model = os.getenv("AUTOROUTER_MODEL", "auto").strip()

        # ── Child span 2: LLM call ────────────────────────────────────────────
        with spanTracing("llm_call", req_id) as llm_span:
            if not api_key:
                answer = (
                    " **Auto Router API Key Missing**\n\n"
                    "Please set `AUTOROUTER_API_KEY` in your `Backend/.env` file to enable AI answer generation.\n\n"
                    "**Retrieved Context Chunks (Current Session):**\n" +
                    "\n".join([f"- **{c['doc_name']}** (Chunk #{c['chunk_id']}): \"{c['text'][:150]}...\"" for c in chunks[:3]])
                )
            else:
                endpoint = f"{base_url}/chat/completions"
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:8000",
                    "X-Title": "Simple-RAG"
                }
                payload = {
                    "model": model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a helpful AI assistant. Answer the user's question using ONLY the provided context."
                        },
                        {
                            "role": "user",
                            "content": f"Context:\n{context_str}\n\nQuestion: {query}"
                        }
                    ],
                    "temperature": 0.3
                }

                response = requests.post(endpoint, headers=headers, json=payload, timeout=30)
                if response.status_code != 200:
                    answer = f"Error from Auto Router API ({response.status_code}): {response.text}"
                else:
                    res_data = response.json()
                    choices = res_data.get("choices", [])
                    if choices and len(choices) > 0:
                        answer = choices[0].get("message", {}).get("content", "").strip()
                    else:
                        answer = "No text choices returned from Auto Router model."

                    # Record token usage if the API returns it
                    usage = res_data.get("usage", {})
                    total_tokens = usage.get("total_tokens")
                    if total_tokens is not None:
                        llm_span.set_metadata("tokens", total_tokens)

        sources = [
            {
                "doc_name": c.get("doc_name"),
                "chunk_id": c.get("chunk_id"),
                "text": c.get("text"),
                "score": float(c.get("score", 0.0))
            }
            for c in chunks
        ]

        return {
            "answer": answer,
            "sources": sources,
            "query": query
        }


# Global RAG pipeline instance
rag_pipeline = RAGPipeline()
