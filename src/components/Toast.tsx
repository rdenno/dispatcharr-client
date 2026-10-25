import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';

interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'error';
  action?: { label: string; run: () => void };
}

type Show = (message: string, opts?: { tone?: Toast['tone']; action?: Toast['action'] }) => void;

const ToastContext = createContext<Show>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback<Show>((message, opts) => {
    window.clearTimeout(timer.current);
    const next: Toast = { id: Date.now(), message, tone: opts?.tone ?? 'info', action: opts?.action };
    setToast(next);
    // Longer when there's an Undo to reach for
    timer.current = window.setTimeout(() => setToast(null), opts?.action ? 8000 : 3500);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4">
          <div
            key={toast.id}
            className={clsx(
              'animate-fade pointer-events-auto flex max-w-md items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-lg',
              toast.tone === 'error' ? 'bg-danger text-white' : 'bg-surface-2 text-white ring-1 ring-line',
            )}
          >
            <span className="flex-1">{toast.message}</span>
            {toast.action && (
              <button
                className="font-semibold text-accent"
                onClick={() => {
                  toast.action?.run();
                  setToast(null);
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
