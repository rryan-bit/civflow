"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** ms before auto-dismiss. Defaults to 4000. */
  duration?: number;
};

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

/** Anywhere under <ToastProvider> (mounted once in the root layout), call
 * `const toast = useToast()` then `toast({ title, description, variant })`
 * to raise a bottom-right notification. */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

const variantStyles: Record<ToastVariant, { icon: ReactNode; ring: string }> = {
  success: {
    ring: "text-emerald-600 dark:text-emerald-400",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <path d="m9 11 3 3L22 4" />
      </svg>
    ),
  },
  error: {
    ring: "text-red-600 dark:text-red-400",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
    ),
  },
  info: {
    ring: "text-slate-500 dark:text-slate-400",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
    ),
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, variant = "info", duration = 4000 }: ToastInput) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, title, description, variant }]);
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6">
        {toasts.map((t) => {
          const style = variantStyles[t.variant];
          return (
            <div
              key={t.id}
              role="status"
              className="surface-card animate-slide-up pointer-events-auto flex items-start gap-2.5 p-3.5 shadow-elevated"
            >
              <span className={`mt-0.5 shrink-0 ${style.ring}`}>{style.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{t.title}</p>
                {t.description && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="shrink-0 rounded-full p-0.5 text-slate-400 transition-colors hover:bg-surface-hover hover:text-slate-600 dark:hover:text-slate-300"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
