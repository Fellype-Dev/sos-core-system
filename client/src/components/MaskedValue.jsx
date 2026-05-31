import { useState } from 'react';

export default function MaskedValue({ value }) {
  const [revealed, setRevealed] = useState(false);

  if (!value || value === '—') return '—';

  const getMasked = (val) => {
    const str = String(val);
    if (str.length <= 6) return '•••';
    return str.slice(0, 3) + '•'.repeat(str.length - 6) + str.slice(-3);
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'inherit' }}>
      <span style={{ fontFamily: revealed ? 'inherit' : 'monospace', letterSpacing: revealed ? 'normal' : '0.05em' }}>
        {revealed ? value : getMasked(value)}
      </span>
      <button
        type="button"
        onClick={() => setRevealed(!revealed)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '2px',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          display: 'inline-flex',
          alignItems: 'center',
          opacity: 0.7,
          transition: 'opacity 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = 0.7; }}
        title={revealed ? "Ocultar dado sensível" : "Visualizar dado sensível"}
      >
        {revealed ? '👁️' : '👁️‍🗨️'}
      </button>
    </span>
  );
}
