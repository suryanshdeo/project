import { NODE_COLORS, NODE_TYPE_LABELS } from '../constants'

export default function Legend({ stats }) {
  return (
    <div style={{
      position: 'absolute', bottom: 20, left: 20,
      background: 'rgba(12, 18, 33, 0.88)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 10,
      padding: '12px 14px',
      minWidth: 180,
      animation: 'fade-up 0.4s ease',
    }}>
      {/* Node types grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px 16px' }}>
        {Object.entries(NODE_TYPE_LABELS).map(([type, label]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: NODE_COLORS[type],
              boxShadow: `0 0 6px ${NODE_COLORS[type]}`,
            }} />
            <span style={{
              fontSize: 10, fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)',
              letterSpacing: '0.01em', fontWeight: 600,
            }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border-subtle)', margin: '10px 0 8px' }} />

      {/* Edge legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <div style={{
          width: 18, height: 1,
          background: 'linear-gradient(90deg, rgba(79,142,255,0.3), rgba(0,212,255,0.3))',
        }} />
        <span style={{
          fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)',
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          Relationship
        </span>
      </div>
    </div>
  )
}
