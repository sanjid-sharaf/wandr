import { useEffect } from 'react';
import { Icon } from './Icon';

export const Toast = ({ toast, setToast }) => {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast, setToast]);

  if (!toast) return null;
  return (
    <div className={`toast ${toast.kind || 'success'}`}>
      {(!toast.kind || toast.kind === 'success') && <Icon name="check" size={14} />}
      {toast.msg}
    </div>
  );
};
