import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((message, type = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => removeToast(id), 4500);
  }, [removeToast]);

  const value = useMemo(() => ({ pushToast, removeToast }), [pushToast, removeToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <aside className="toast-region" aria-label="Thong bao he thong" aria-live="polite">
        {toasts.map((toast) => (
          <article className={`toast toast-${toast.type}`} key={toast.id}>
            <p>{toast.message}</p>
            <button type="button" className="toast-close" onClick={() => removeToast(toast.id)} aria-label="Dong thong bao">x</button>
          </article>
        ))}
      </aside>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
