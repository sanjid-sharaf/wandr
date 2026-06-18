import { Modal } from './Modal';
import { THEMES } from '@/hooks/useTheme';

export const ThemePicker = ({ theme, setTheme, onClose }) => (
  <Modal title="Choose Theme" onClose={onClose} size={380}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
      {THEMES.map((t) => (
        <button
          key={t.id}
          onClick={() => { setTheme(t.id); onClose(); }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            padding: '12px 8px', borderRadius: 'var(--radius-sm)',
            border: theme === t.id ? '2px solid var(--accent)' : '2px solid var(--border)',
            background: theme === t.id ? 'var(--accent-soft)' : 'var(--surface2)',
            cursor: 'pointer', transition: 'var(--transition)',
          }}
        >
          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, background: t.swatch[0], border: '1px solid rgba(255,255,255,0.08)' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: t.swatch[1] }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 500, color: theme === t.id ? 'var(--accent)' : 'var(--ink2)' }}>
            {t.label}
          </span>
        </button>
      ))}
    </div>
  </Modal>
);
