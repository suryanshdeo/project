import { useState, useRef, useEffect } from 'react'

function SqlBlock({ sql }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginTop: 10 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 10, fontFamily: 'var(--font-mono)',
          color: open ? 'var(--accent-cyan)' : 'var(--text-tertiary)',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          transition: 'color 0.15s',
        }}
      >
        <span style={{ fontSize: 8 }}>{open ? '▼' : '▶'}</span>
        {open ? 'Hide SQL' : 'View SQL'}
      </button>
      {open && (
        <pre style={{
          marginTop: 8,
          padding: '10px 12px',
          background: 'rgba(6, 9, 18, 0.8)',
          border: '1px solid rgba(0,212,255,0.15)',
          borderLeft: '2px solid rgba(0,212,255,0.5)',
          borderRadius: '0 6px 6px 0',
          fontSize: 10, fontFamily: 'var(--font-mono)',
          color: 'rgba(0,212,255,0.85)',
          overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          lineHeight: 1.7, letterSpacing: '0.01em',
          animation: 'fade-up 0.15s ease',
        }}>
          {sql}
        </pre>
      )}
    </div>
  )
}

function RowsTable({ rows }) {
  const [open, setOpen] = useState(false)
  if (!rows || rows.length === 0) return null
  const cols = Object.keys(rows[0])
  return (
    <div style={{ marginTop: 10 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 10, fontFamily: 'var(--font-mono)',
          color: open ? 'var(--accent-blue)' : 'var(--text-tertiary)',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          transition: 'color 0.15s',
        }}
      >
        <span style={{ fontSize: 8 }}>{open ? '▼' : '▶'}</span>
        {open ? 'Hide data' : `${rows.length} row${rows.length !== 1 ? 's' : ''} returned`}
      </button>
      {open && (
        <div style={{
          marginTop: 8, overflowX: 'auto', maxHeight: 200, overflowY: 'auto',
          border: '1px solid var(--border-subtle)', borderRadius: 6,
          animation: 'fade-up 0.15s ease',
        }}>
          <table style={{ fontSize: 10, borderCollapse: 'collapse', width: '100%', fontFamily: 'var(--font-mono)' }}>
            <thead>
              <tr>
                {cols.map(c => (
                  <th key={c} style={{
                    padding: '5px 10px',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)',
                    textAlign: 'left', whiteSpace: 'nowrap',
                    position: 'sticky', top: 0,
                    fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'rgba(79,142,255,0.02)' }}>
                  {cols.map(c => (
                    <td key={c} style={{
                      padding: '4px 10px', color: 'var(--text-data)',
                      whiteSpace: 'nowrap', maxWidth: 180,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {row[c] === null || row[c] === undefined ? '—' : String(row[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  const isError = msg.role === 'error'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 14,
      animation: 'fade-up 0.2s ease',
    }}>
      {!isUser && (
        <div style={{
          fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)',
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5,
          paddingLeft: 2,
        }}>
          {isError ? 'system · error' : 'o2c intelligence'}
        </div>
      )}

      <div style={{
        maxWidth: '88%',
        padding: isUser ? '8px 12px' : '10px 14px',
        borderRadius: isUser ? '10px 10px 3px 10px' : '3px 10px 10px 10px',
        background: isUser
          ? 'rgba(79,142,255,0.15)'
          : isError
            ? 'rgba(255,77,109,0.08)'
            : 'var(--bg-elevated)',
        border: isUser
          ? '1px solid rgba(79,142,255,0.3)'
          : isError
            ? '1px solid rgba(255,77,109,0.2)'
            : '1px solid var(--border-subtle)',
        color: isError ? 'var(--accent-red)' : 'var(--text-primary)',
        fontSize: 13, lineHeight: 1.6,
        fontFamily: 'var(--font-ui)',
      }}>
        {isUser && (
          <div style={{
            fontSize: 8, fontFamily: 'var(--font-mono)', color: 'rgba(79,142,255,0.6)',
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4,
          }}>
            query
          </div>
        )}
        {msg.content}
        {msg.sql && <SqlBlock sql={msg.sql} />}
        {msg.rows && <RowsTable rows={msg.rows} />}
      </div>

      {msg.rowCount > 0 && !isUser && (
        <div style={{
          fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)',
          marginTop: 4, paddingLeft: 2, letterSpacing: '0.04em',
        }}>
          {msg.rowCount} record{msg.rowCount !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}

function ThinkingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingLeft: 2 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 4, height: 4, borderRadius: '50%', background: 'var(--accent-cyan)',
            animation: `dot-bounce 1.2s ease-in-out ${i * 0.18}s infinite`,
          }} />
        ))}
      </div>
      <span style={{
        fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)',
        letterSpacing: '0.08em', textTransform: 'uppercase',
      }}>
        Processing
      </span>
    </div>
  )
}

const SUGGESTED = [
  'How many sales orders are there?',
  'Which customers have the most orders?',
  'Show me unpaid invoices',
  'Total revenue from billing docs?',
]

export default function ChatPanel({ messages, setMessages }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(question) {
    const q = question || input.trim()
    if (!q || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: q }])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      const data = await res.json()

      if (!res.ok) {
        setMessages(prev => [...prev, { role: 'error', content: data.detail || 'Request failed' }])
        return
      }

      if (!data.allowed) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.reason || 'That question is outside the scope of this system.',
        }])
        return
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        sql: data.sql,
        rows: data.rows,
        rowCount: data.row_count,
      }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'error', content: `Network error: ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--bg-panel)',
    }}>
      {/* Header */}
      <div style={{
        padding: '13px 16px 12px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-surface)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--accent-cyan)',
            boxShadow: '0 0 8px var(--accent-cyan)',
            animation: 'pulse-glow 2.5s ease-in-out infinite',
          }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
            O2C Intelligence
          </span>
          <span style={{
            marginLeft: 'auto',
            fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            NL → SQL
          </span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 8px' }}>
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        {loading && <ThinkingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Suggested queries */}
      {messages.length <= 1 && !loading && (
        <div style={{ padding: '0 14px 10px', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {SUGGESTED.map(s => (
            <button
              key={s}
              onClick={() => send(s)}
              style={{
                fontSize: 10, padding: '4px 9px', borderRadius: 4,
                background: 'rgba(79,142,255,0.06)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer', fontFamily: 'var(--font-ui)',
                transition: 'all 0.15s',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(79,142,255,0.12)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-muted)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(79,142,255,0.06)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: '10px 14px 14px',
        borderTop: '1px solid var(--border-subtle)',
        flexShrink: 0,
        background: 'var(--bg-surface)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 8,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-muted)',
          borderRadius: 8, padding: '8px 10px',
          transition: 'border-color 0.2s',
        }}>
          <span style={{
            fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)',
            opacity: 0.7, paddingBottom: 1, flexShrink: 0,
          }}>›</span>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about orders, billing, customers..."
            disabled={loading}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 12, fontFamily: 'var(--font-ui)', color: 'var(--text-primary)',
              lineHeight: 1.5, resize: 'none',
            }}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            style={{
              flexShrink: 0,
              width: 28, height: 28,
              borderRadius: 5, border: 'none',
              background: loading || !input.trim() ? 'rgba(255,255,255,0.04)' : 'rgba(0,212,255,0.15)',
              color: loading || !input.trim() ? 'var(--text-tertiary)' : 'var(--accent-cyan)',
              cursor: loading || !input.trim() ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, transition: 'all 0.15s',
              border: `1px solid ${loading || !input.trim() ? 'transparent' : 'rgba(0,212,255,0.25)'}`,
            }}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}
