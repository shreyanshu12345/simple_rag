import React, { useState } from 'react';

export default function DocumentUploader({ apiBaseUrl, sessionId, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [chunkSize, setChunkSize] = useState(500);
  const [chunkOverlap, setChunkOverlap] = useState(50);
  const [uploading, setUploading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatusMsg(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.target.files[0]);
      setStatusMsg(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setStatusMsg(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', sessionId);
    formData.append('chunk_size', chunkSize);
    formData.append('chunk_overlap', chunkOverlap);

    try {
      const res = await fetch(`${apiBaseUrl}/uploadfile/`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Upload failed');
      }

      setStatusMsg({ type: 'success', text: `Ingested '${data.filename}' into MongoDB Atlas (${data.chunks_count} chunks created).` });
      setFile(null);
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-accent)" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          Document Ingestion
        </h2>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}
        >
          ⚙️ Chunking Config
        </button>
      </div>

      {showSettings && (
        <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.75rem', borderRadius: '8px', display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
          <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span>Chunk Size (chars):</span>
            <input 
              type="number" 
              value={chunkSize} 
              onChange={(e) => setChunkSize(Number(e.target.value))}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: '#fff', padding: '0.4rem', borderRadius: '6px' }}
            />
          </label>
          <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span>Overlap (chars):</span>
            <input 
              type="number" 
              value={chunkOverlap} 
              onChange={(e) => setChunkOverlap(Number(e.target.value))}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: '#fff', padding: '0.4rem', borderRadius: '6px' }}
            />
          </label>
        </div>
      )}

      <div 
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        style={{
          border: '2px dashed var(--border-light)',
          borderRadius: '12px',
          padding: '1.5rem',
          textAlign: 'center',
          background: file ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
          borderColor: file ? 'var(--primary-accent)' : 'var(--border-light)',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        <input 
          type="file" 
          accept=".pdf,.txt,.md" 
          onChange={handleFileChange} 
          id="file-upload" 
          style={{ display: 'none' }}
        />
        <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={file ? "var(--primary-accent)" : "var(--text-muted)"} strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
          {file ? (
            <div>
              <p style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>{file.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 500, color: '#fff' }}>Click or Drag & Drop PDF / TXT file</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Isolated to current browser session</p>
            </div>
          )}
        </label>
      </div>

      {statusMsg && (
        <div style={{
          padding: '0.6rem 0.8rem',
          borderRadius: '8px',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: statusMsg.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: statusMsg.type === 'success' ? '#4ade80' : '#f87171',
          border: `1px solid ${statusMsg.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
        }}>
          <span>{statusMsg.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{statusMsg.text}</span>
        </div>
      )}

      <button 
        onClick={handleUpload} 
        disabled={!file || uploading} 
        className="gradient-btn"
        style={{ width: '100%', justifyContent: 'center' }}
      >
        {uploading ? 'Processing & Chunking...' : 'Ingest to Private Session Collection'}
      </button>
    </div>
  );
}
