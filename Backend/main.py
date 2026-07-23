from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from chunker import DocumentChunker
from embedder import embedder
from db import db_manager
from rag import rag_pipeline

app = FastAPI(title="Simple RAG Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

chunker = DocumentChunker(chunk_size=500, chunk_overlap=50)


class QueryRequest(BaseModel):
    query: str
    session_id: Optional[str] = None
    top_k: Optional[int] = 4


class CleanupRequest(BaseModel):
    session_id: str


@app.get("/")
async def root():
    try:
        return {
            "message": "Simple RAG API is running.",
            "status": "online"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Root endpoint error: {str(e)}")


@app.get("/health/")
async def health():
    try:
        is_connected = db_manager.is_connected()
        return {
            "status": "ok" if is_connected else "degraded",
            "mongodb_connected": is_connected
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")


@app.post("/uploadfile/")
async def upload_file(
    file: UploadFile = File(...),
    session_id: str = Form(...),
    chunk_size: Optional[int] = Form(500),
    chunk_overlap: Optional[int] = Form(50)
):
    try:
        content_bytes = await file.read()
        text = chunker.extract_text(content_bytes, file.filename)
        if not text or not text.strip():
            raise HTTPException(status_code=400, detail="File is empty or unreadable.")

        doc_chunker = DocumentChunker(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        chunks = doc_chunker.chunk_document(text, file.filename)

        if not chunks:
            raise HTTPException(status_code=400, detail="No chunks generated from document.")

        embeddings = embedder.embed_texts([c["text"] for c in chunks])
        inserted = db_manager.save_chunks(chunks, embeddings, session_id=session_id)

        return {
            "filename": file.filename,
            "session_id": session_id,
            "chunks_count": len(chunks),
            "inserted": inserted
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@app.post("/query/")
async def query_rag(payload: QueryRequest):
    try:
        if not payload.query or not payload.query.strip():
            raise HTTPException(status_code=400, detail="Query string cannot be empty.")
        return rag_pipeline.answer_query(payload.query, session_id=payload.session_id, top_k=payload.top_k or 4)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query execution failed: {str(e)}")


@app.get("/documents/")
async def list_documents(session_id: Optional[str] = Query(None)):
    try:
        docs = db_manager.get_documents_summary(session_id=session_id)
        return {"documents": docs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list documents: {str(e)}")


@app.delete("/documents/{doc_name}")
async def delete_document(doc_name: str, session_id: Optional[str] = Query(None)):
    try:
        deleted = db_manager.delete_document(doc_name, session_id=session_id)
        return {"deleted": deleted, "doc_name": doc_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete document '{doc_name}': {str(e)}")


@app.post("/cleanup/")
async def cleanup_session(payload: CleanupRequest):
    try:
        if not payload.session_id:
            raise HTTPException(status_code=400, detail="session_id is required.")
        deleted = db_manager.delete_session_chunks(payload.session_id)
        return {
            "status": "success",
            "session_id": payload.session_id,
            "deleted_chunks": deleted
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")