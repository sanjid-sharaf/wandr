import { useState, useCallback } from 'react';

export const useToast = () => {
  const [toast, setToast] = useState(null);
  const showToast = useCallback((msg, kind = 'success') => setToast({ msg, kind }), []);
  return { toast, setToast, showToast };
};
