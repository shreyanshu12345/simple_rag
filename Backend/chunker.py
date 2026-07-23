import io
from typing import List, Dict, Any
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter


class DocumentChunker:
    """Document chunking using LangChain RecursiveCharacterTextSplitter and PyPDF."""
    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50):
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""]
        )

    def extract_text(self, file_bytes: bytes, filename: str) -> str:
        """Extract text from PDF or plain text bytes."""
        if filename.lower().endswith(".pdf"):
            reader = PdfReader(io.BytesIO(file_bytes))
            pages_text = [p.extract_text() for p in reader.pages if p.extract_text()]
            return "\n\n".join(pages_text)
        return file_bytes.decode("utf-8", errors="ignore")

    def chunk_document(self, text: str, doc_name: str) -> List[Dict[str, Any]]:
        """Split text recursively into chunk dictionaries."""
        if not text.strip():
            return []

        raw_chunks = self.splitter.split_text(text)
        return [
            {
                "chunk_id": idx,
                "doc_name": doc_name,
                "text": chunk,
                "char_length": len(chunk)
            }
            for idx, chunk in enumerate(raw_chunks)
        ]
