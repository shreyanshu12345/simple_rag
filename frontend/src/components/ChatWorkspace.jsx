import React, { useState, useRef, useEffect } from 'react';

export default function ChatWorkspace({ apiBaseUrl, sessionId }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hello! I am your session-isolated RAG assistant. Your uploaded documents are strictly private to your current browser session and will be deleted automatically when you exit.',
      sources: []
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState({});
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const toggleSource = (msgId) => {
    setExpandedSources(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const handleSend = async (queryText = null) => {
    const q = queryText || input;
    if (!q.trim() || loading) return;

    const userMsg = { id: Date.now().toString(), role: 'user', text: q };
    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${apiBaseUrl}/query/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, session_id: sessionId, top_k: 4 })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Query request failed');
      }

      const botMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: data.answer,
        sources: data.sources || []
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: `Error: ${err.message}`,
          sources: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const samplePrompts = [
    "Summarize the key points from the ingested document.",
    "What specific recommendations are made in the text?",
    "Extract any numbers, dates, or quantitative metrics."
  ];

  return (
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', margin: '0 1rem 1rem 1rem', padding: '1.25rem', overflow: 'hidden' }}>
      <div style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'var(--primary-accent)' }}>✨</span>
          Session-Isolated RAG Chat
        </h2>
        <span style={{ fontSize: '0.75rem', color: '#4ade80', background: 'rgba(34, 197, 94, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
          🔒 Private Session
        </span>
      </div>

      {/* Messages Stream */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            style={{
              display: 'flex',
              gap: '0.75rem',
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%'
            }}
          >
            {msg.role === 'assistant' && (
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--primary-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="10" rx="2"></rect>
                  <circle cx="12" cy="5" r="2"></circle>
                  <path d="M12 7v4"></path>
                  <line x1="8" y1="16" x2="8" y2="16"></line>
                  <line x1="16" y1="16" x2="16" y2="16"></line>
                </svg>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{
                padding: '0.85rem 1.1rem',
                borderRadius: '12px',
                fontSize: '0.9rem',
                lineHeight: '1.5',
                background: msg.role === 'user' ? 'var(--primary-gradient)' : 'rgba(255, 255, 255, 0.05)',
                color: '#fff',
                border: msg.role === 'assistant' ? '1px solid var(--border-light)' : 'none',
                boxShadow: msg.role === 'user' ? '0 4px 15px rgba(99, 102, 241, 0.3)' : 'none'
              }}>
                <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
              </div>

              {/* Source Chunks Citation Accordion */}
              {msg.sources && msg.sources.length > 0 && (
                <div style={{ background: 'rgba(0, 0, 0, 0.25)', borderRadius: '8px', padding: '0.5rem 0.75rem', border: '1px solid var(--border-light)' }}>
                  <button
                    onClick={() => toggleSource(msg.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--primary-accent)',
                      fontSize: '0.775rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      width: '100%'
                    }}
                  >
                    <span>📖 Retrieved {msg.sources.length} Context Chunks from MongoDB Atlas</span>
                    <span>{expandedSources[msg.id] ? '▲' : '▼'}</span>
                  </button>

                  {expandedSources[msg.id] && (
                    <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {msg.sources.map((src, i) => (
                        <div key={i} style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                            <span style={{ fontWeight: 600, color: '#a5b4fc' }}>{src.doc_name} (Chunk #{src.chunk_id})</span>
                            <span>Score: {(src.score * 100).toFixed(1)}%</span>
                          </div>
                          <p style={{ color: 'var(--text-main)', fontStyle: 'italic' }}>"{src.text}"</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <span>🤖 Searching session vectors & generating answer...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggested prompts */}
      {messages.length === 1 && (
        <div style={{ margin: '0.5rem 0', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {samplePrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-light)',
                color: 'var(--text-muted)',
                borderRadius: '16px',
                padding: '0.4rem 0.8rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              💡 {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input box */}
      <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask a question about your knowledge base documents..."
          style={{
            flex: 1,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            padding: '0.8rem 1rem',
            color: '#fff',
            fontSize: '0.9rem',
            outline: 'none'
          }}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          className="gradient-btn"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>
  );
}
