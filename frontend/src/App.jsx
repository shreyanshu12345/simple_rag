import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DocumentUploader from './components/DocumentUploader';
import DocumentList from './components/DocumentList';
import ChatWorkspace from './components/ChatWorkspace';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function getOrCreateSessionId() {
  let id = sessionStorage.getItem('rag_session_id');
  if (!id) {
    id = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    sessionStorage.setItem('rag_session_id', id);
  }
  return id;
}

export default function App() {
  const [sessionId] = useState(getOrCreateSessionId);
  const [health, setHealth] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/health/`);
      const data = await res.json();
      setHealth(data);
    } catch (e) {
      setHealth({ mongodb_connected: false });
    }
  };

  const fetchDocuments = async () => {
    setLoadingDocs(true);
    try {
      const res = await fetch(`${API_BASE_URL}/documents/?session_id=${encodeURIComponent(sessionId)}`);
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (e) {
      setDocuments([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleDeleteDocument = async (docName) => {
    try {
      await fetch(`${API_BASE_URL}/documents/${encodeURIComponent(docName)}?session_id=${encodeURIComponent(sessionId)}`, {
        method: 'DELETE'
      });
      fetchDocuments();
    } catch (e) {
      console.error('Delete document failed:', e);
    }
  };

  const handleClearSession = async () => {
    try {
      await fetch(`${API_BASE_URL}/cleanup/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      });
      fetchDocuments();
    } catch (e) {
      console.error('Session cleanup error:', e);
    }
  };

  // Automated cleanup when the user closes the browser tab / window or navigates away
  useEffect(() => {
    const handleUnload = () => {
      const payload = JSON.stringify({ session_id: sessionId });
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(`${API_BASE_URL}/cleanup/`, blob);
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [sessionId]);

  useEffect(() => {
    fetchHealth();
    fetchDocuments();
  }, [sessionId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar 
        health={health} 
        onRefreshHealth={fetchHealth} 
        onClearSession={handleClearSession}
      />

      <main style={{ display: 'flex', flex: 1, gap: '1rem', padding: '0 1rem 1rem 1rem' }}>
        {/* Left Sidebar: Knowledge Base & Upload */}
        <aside style={{ width: '360px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <DocumentUploader 
            apiBaseUrl={API_BASE_URL} 
            sessionId={sessionId}
            onUploadSuccess={fetchDocuments} 
          />
          <DocumentList 
            documents={documents} 
            onDeleteDocument={handleDeleteDocument} 
            loading={loadingDocs} 
          />
        </aside>

        {/* Right Main Panel: Interactive RAG Chat */}
        <section style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <ChatWorkspace 
            apiBaseUrl={API_BASE_URL} 
            sessionId={sessionId}
          />
        </section>
      </main>
    </div>
  );
}
