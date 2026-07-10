import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { subscribeToast, type ToastPayload, type ToastVariant } from "../utils/toastBus";

type ToastItem = {
  id: string;
  variant: ToastVariant;
  title?: string;
  message: string;
  durationMs: number;
};

type ToastContextValue = {
  notify: (toast: ToastPayload) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const variantStyles: Record<ToastVariant, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-red-200 bg-red-50 text-red-900",
  info: "border-sky-200 bg-sky-50 text-sky-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
};

const variantIcons: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const defaultTitles: Record<ToastVariant, string> = {
  success: "Thành công / Success",
  error: "Không thành công / Failed",
  info: "Thông tin / Info",
  warning: "Cần chú ý / Notice",
};

function createToast(payload: ToastPayload): ToastItem {
  return {
    id: payload.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    variant: payload.variant || "info",
    title: payload.title,
    message: payload.message,
    durationMs: payload.durationMs ?? 4500,
  };
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((payload: ToastPayload) => {
    const toast = createToast(payload);
    setToasts((current) => [toast, ...current].slice(0, 4));

    window.setTimeout(() => dismiss(toast.id), toast.durationMs);
  }, [dismiss]);

  useEffect(() => subscribeToast(notify), [notify]);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((toast) => {
          const Icon = variantIcons[toast.variant];
          return (
            <div key={toast.id} className={`pointer-events-auto rounded-lg border px-4 py-3 shadow-lg ${variantStyles[toast.variant]}`}>
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{toast.title || defaultTitles[toast.variant]}</p>
                  <div className="mt-1 space-y-0.5 text-sm leading-5">
                    {toast.message.split("\n").map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </div>
                <button aria-label="Đóng thông báo" className="-mr-1 rounded-md p-1 hover:bg-black/5" onClick={() => dismiss(toast.id)} type="button">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
