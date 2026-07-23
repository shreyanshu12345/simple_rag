import React from 'react';

export default function DocumentList({ documents, onDeleteDocument, loading }) {
  return (
    <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-accent)" strokeWidth="2">
            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
          </svg>
          My Session Documents ({documents.length})
        </h2>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem 0' }}>
          Fetching session documents...
        </div>
      ) : documents.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 1rem', border: '1px dashed var(--border-light)', borderRadius: '10px' }}>
          <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔒</p>
          <p>No documents uploaded in your private session.</p>
          <p style={{ fontSize: '0.75rem', marginTop: '0.2rem', color: 'var(--text-dim)' }}>Docs auto-delete on tab close.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '280px', overflowY: 'auto' }}>
          {documents.map((doc, idx) => (
            <div 
              key={idx} 
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                padding: '0.75rem 0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <div style={{ overflow: 'hidden' }}>
                  <p style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {doc.doc_name}
                  </p>
                  <p style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                    {doc.chunk_count} chunks • {doc.total_chars} chars
                  </p>
                </div>
              </div>
              <button
                onClick={() => onDeleteDocument(doc.doc_name)}
                title="Delete document chunks"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: 'none',
                  color: '#f87171',
                  padding: '0.4rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
