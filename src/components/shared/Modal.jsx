import { useEffect } from 'react';
import { Icon } from './Icon';

export const Modal = ({ title, onClose, footer, children, size = 500 }) => {
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: size }}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="btn-icon" onClick={onClose}><Icon name="x" size={15} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

export const ConfirmModal = ({ message, onConfirm, onClose, confirmLabel = 'Delete', danger = true }) => (
  <Modal
    title="Confirm"
    onClose={onClose}
    footer={
      <>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
          onClick={() => { onConfirm(); onClose(); }}
        >
          {confirmLabel}
        </button>
      </>
    }
  >
    <p style={{ color: 'var(--ink2)', fontSize: 14, lineHeight: 1.6 }}>{message}</p>
  </Modal>
);
