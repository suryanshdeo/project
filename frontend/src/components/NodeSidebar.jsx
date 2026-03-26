import { NODE_COLORS, NODE_TYPE_LABELS } from '../constants'

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

function FieldRow({ label, value }) {
  const formatted = formatValue(value)
  const isLong = typeof value === 'object' || formatted.length > 50

  return (
    <div style={{
      padding: '8px 0',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{
        fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)',
        letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4,
      }}>
        {label}
      </div>
      {isLong ? (
        <pre style={{
          fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-data)',
          whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          background: 'rgba(79,142,255,0.05)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 4, padding: '6px 8px', marginTop: 2,
          lineHeight: 1.6,
        }}>
          {formatted}
        </pre>
      ) : (
        <div style={{
          fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)',
          lineHeight: 1.4,
        }}>
          {formatted}
        </div>
      )}
    </div>
  )
}

function RecordBlock({ record, index, total }) {
  return (
    <div style={{ marginBottom: total > 1 ? 16 : 0 }}>
      {total > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
        }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
          <span style={{
            fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)',
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            {index + 1} / {total}
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
        </div>
      )}
      {Object.entries(record).map(([k, v]) => (
        <FieldRow key={k} label={k} value={v} />
      ))}
    </div>
  )
}

export default function NodeSidebar({ detail, loading, onClose }) {
  if (!detail && !loading) return null

  const color = detail ? (NODE_COLORS[detail.type] || 'var(--text-secondary)') : 'var(--text-secondary)'
  const typeLabel = detail ? (NODE_TYPE_LABELS[detail.type] || detail.type) : ''

  return (
    <div style={{
      width: 288, height: '100%', display: 'flex', flexDirection: 'column',
      background: 'var(--bg-surface)',
      borderLeft: '1px solid var(--border-subtle)',
      overflow: 'hidden',
      animation: 'slide-in 0.2s ease',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-panel)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Type badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 8px', borderRadius: 3, marginBottom: 8,
              background: `${color}18`,
              border: `1px solid ${color}40`,
            }}>
              <div style={{
                width: 5, height: 5, borderRadius: '50%',
                background: color,
                boxShadow: `0 0 6px ${color}`,
              }} />
              <span style={{
                fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 500,
                color, letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                {typeLabel}
              </span>
            </div>

            {/* Node ID */}
            {detail && (
              <div style={{
                fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-data)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                letterSpacing: '0.01em',
              }}>
                {detail.node_id}
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            style={{
              flexShrink: 0, marginLeft: 8, marginTop: 2,
              width: 24, height: 24, borderRadius: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-tertiary)', cursor: 'pointer',
              fontSize: 14, lineHeight: 1,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.target.style.color = 'var(--text-primary)'; e.target.style.borderColor = 'var(--border-muted)' }}
            onMouseLeave={e => { e.target.style.color = 'var(--text-tertiary)'; e.target.style.borderColor = 'var(--border-subtle)' }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 16px' }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 32 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-cyan)',
                animation: `dot-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
        )}
        {detail?.error && (
          <div style={{
            marginTop: 16, padding: '10px 12px', borderRadius: 6,
            background: 'rgba(255,77,109,0.08)', border: '1px solid rgba(255,77,109,0.2)',
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-red)',
          }}>
            {detail.error}
          </div>
        )}
        {detail?.record && (
          <RecordBlock record={detail.record} index={0} total={1} />
        )}
        {detail?.records && detail.records.map((rec, i) => (
          <RecordBlock key={i} record={rec} index={i} total={detail.records.length} />
        ))}
      </div>
    </div>
  )
}
