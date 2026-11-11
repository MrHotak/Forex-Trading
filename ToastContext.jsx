import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);
const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const remove = useCallback((id) => setToasts((list) => list.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (type, message) => {
      const id = ++idRef.current;
      setToasts((list) => [...list.slice(-3), { id, type, message }]);
      setTimeout(() => remove(id), type === 'error' ? 6000 : 3500);
    },
    [remove],
  );

  const api = useMemo(
    () => ({ success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m) }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((x) => {
          const Icon = ICONS[x.type];
          return (
            <div key={x.id} className={`toast toast-${x.type}`}>
              <Icon size={18} />
              <span>{x.message}</span>
              <button className="icon-btn" onClick={() => remove(x.id)} aria-label="close">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
