import React, { useEffect, useState } from 'react';
import { useSimStore } from '../store/useSimStore';

const VARIANT_STYLES = {
  success: { bg: '#F0FDF4', border: '#BBF7D0', icon: '✓', color: '#16A34A' },
  warning: { bg: '#FFFBEB', border: '#FDE68A', icon: '!', color: '#D97706' },
  error:   { bg: '#FEF2F2', border: '#FECACA', icon: '✕', color: '#DC2626' },
  info:    { bg: '#EFF6FF', border: '#BFDBFE', icon: '●', color: '#2563EB' },
};

function Toast({ toast, onDismiss }) {
  const [exiting, setExiting] = useState(false);
  const style = VARIANT_STYLES[toast.variant] || VARIANT_STYLES.info;

  const dismiss = () => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 260);
  };

  return (
    <div
      className={exiting ? 'toast-exit' : 'toast-enter'}
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: '8px',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        minWidth: '240px',
        maxWidth: '320px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        cursor: 'pointer',
      }}
      onClick={dismiss}
    >
      <span style={{ color: style.color, fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
        {style.icon}
      </span>
      <span style={{
        color: '#0F172A',
        fontSize: '0.78rem',
        fontFamily: "'Inter', sans-serif",
        lineHeight: '1.4',
        flex: 1,
      }}>
        {toast.message}
      </span>
    </div>
  );
}

export default function ToastManager() {
  const { toasts, dismissToast } = useSimStore();

  return (
    <div style={{
      position: 'fixed',
      top: '60px',
      right: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      zIndex: 500,
      pointerEvents: 'none',
    }}>
      {toasts.map(toast => (
        <div key={toast.id} style={{ pointerEvents: 'all' }}>
          <Toast toast={toast} onDismiss={dismissToast} />
        </div>
      ))}
    </div>
  );
}
