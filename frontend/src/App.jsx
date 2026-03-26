import { useState, useCallback } from 'react'
import GraphPanel from './components/GraphPanel'
import NodeSidebar from './components/NodeSidebar'
import ChatPanel from './components/ChatPanel'
import Legend from './components/Legend'
import { useGraph } from './hooks/useGraph'
import { useNodeDetail } from './hooks/useNodeDetail'
import './index.css'

function StatPill({ label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <span style={{
        fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-mono)',
        color, letterSpacing: '-0.02em', lineHeight: 1,
      }}>{value}</span>
      <span style={{
        fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)',
        letterSpacing: '0.1em', textTransform: 'uppercase',
      }}>{label}</span>
    </div>
  )
}

export default function App() {
  const { elements, loading: graphLoading, error: graphError, stats } = useGraph()
  const { detail, loading: detailLoading, fetchDetail, clearDetail } = useNodeDetail()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      content: 'Ask me anything about your SAP Order-to-Cash data — orders, deliveries, billing, payments, customers, or products.',
    },
  ])

  const handleNodeClick = useCallback((nodeId) => {
    if (!nodeId) { setSidebarOpen(false); clearDetail(); return }
    setSidebarOpen(true)
    fetchDetail(nodeId)
  }, [fetchDetail, clearDetail])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-void)', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' }}>

      {/* Header */}
      <header style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 54,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0, zIndex: 20,
      }}>
        {/* Animated gradient accent line */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent 0%, var(--accent-blue) 30%, var(--accent-cyan) 60%, transparent 100%)',
          backgroundSize: '200% 100%',
          opacity: 0.45,
          animation: 'shimmer-line 6s linear infinite',
        }} />

        {/* Left: Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ position: 'relative', width: 30, height: 30, flexShrink: 0 }}>
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
              <circle cx="15" cy="5" r="2.5" fill="var(--accent-cyan)" opacity="0.9" />
              <circle cx="26" cy="22" r="2.5" fill="var(--accent-blue)" opacity="0.9" />
              <circle cx="4"  cy="22" r="2.5" fill="var(--accent-blue)" opacity="0.9" />
              <line x1="15" y1="5"  x2="26" y2="22" stroke="var(--accent-cyan)"  strokeWidth="0.8" opacity="0.4" />
              <line x1="15" y1="5"  x2="4"  y2="22" stroke="var(--accent-blue)"  strokeWidth="0.8" opacity="0.4" />
              <line x1="4"  y1="22" x2="26" y2="22" stroke="var(--accent-blue)"  strokeWidth="0.8" opacity="0.25" />
              <circle cx="15" cy="14" r="4" fill="none" stroke="var(--accent-cyan)" strokeWidth="0.75" opacity="0.3" />
            </svg>
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 5, height: 5, borderRadius: '50%',
              background: 'var(--accent-cyan)',
              boxShadow: '0 0 10px var(--accent-cyan)',
              animation: 'pulse-glow 3s ease-in-out infinite',
            }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, color: 'var(--text-primary)' }}>
              O2C <span style={{ color: 'var(--accent-cyan)' }}>Intelligence</span>
            </div>
            <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
              SAP Order-to-Cash · Graph Explorer
            </div>
          </div>
        </div>

        {/* Center: Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '6px 20px', borderRadius: 6, background: 'var(--border-subtle)', border: '1px solid var(--border-subtle)' }}>
          <StatPill label="Nodes" value={stats?.nodes ?? '—'} color="var(--accent-blue)" />
          <div style={{ width: 1, height: 20, background: 'var(--border-subtle)' }} />
          <StatPill label="Edges" value={stats?.edges ?? '—'} color="var(--accent-cyan)" />
          <div style={{ width: 1, height: 20, background: 'var(--border-subtle)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 5, height: 5, borderRadius: '50%',
              background: 'var(--accent-emerald)', color: 'var(--accent-emerald)',
              boxShadow: '0 0 8px var(--accent-emerald)',
              animation: 'pulse-glow 2s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)', letterSpacing: '0.1em' }}>LIVE</span>
          </div>
        </div>

        {/* Right: Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setChatOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 16px', borderRadius: 6,
              fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-ui)',
              letterSpacing: '0.04em',
              background: chatOpen ? 'rgba(0, 212, 255, 0.1)' : 'rgba(255,255,255,0.03)',
              color: chatOpen ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              border: `1px solid ${chatOpen ? 'rgba(0,212,255,0.3)' : 'var(--border-subtle)'}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M1 1h11v8H7.5L6.5 12l-1-3H1V1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill={chatOpen ? 'rgba(0,212,255,0.15)' : 'none'} />
            </svg>
            {chatOpen ? 'Close AI' : 'Ask AI'}
          </button>
        </div>
      </header>

      {/* Main */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Graph area */}
        <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
          {graphLoading && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-void)', zIndex: 10, gap: 16,
            }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-cyan)',
                    animation: `dot-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.08em' }}>
                LOADING GRAPH
              </span>
            </div>
          )}
          {graphError && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center', background: 'var(--bg-void)', zIndex: 10,
            }}>
              <div style={{
                padding: '14px 20px', borderRadius: 8,
                background: 'rgba(255,77,109,0.08)',
                border: '1px solid rgba(255,77,109,0.25)',
                fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-red)',
              }}>
                ERROR: {graphError}
              </div>
            </div>
          )}
          {!graphLoading && !graphError && (
            <>
              <GraphPanel elements={elements} onNodeClick={handleNodeClick} />
              <Legend stats={stats} />
            </>
          )}
        </div>

        {/* Node sidebar */}
        {sidebarOpen && (
          <NodeSidebar
            detail={detail}
            loading={detailLoading}
            onClose={() => { setSidebarOpen(false); clearDetail() }}
          />
        )}

        {/* Chat panel */}
        {chatOpen && (
          <div style={{ width: 360, flexShrink: 0, overflow: 'hidden', borderLeft: '1px solid var(--border-subtle)' }}>
            <ChatPanel messages={chatMessages} setMessages={setChatMessages} />
          </div>
        )}
      </div>
    </div>
  )
}
