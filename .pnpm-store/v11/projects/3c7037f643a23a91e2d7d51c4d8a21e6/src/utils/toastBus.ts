export type ToastVariant = "success" | "error" | "info" | "warning";

export type ToastPayload = {
  id?: string;
  variant?: ToastVariant;
  title?: string;
  message: string;
  durationMs?: number;
};

export const TOAST_EVENT = "app:toast";

export function emitToast(payload: ToastPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastPayload>(TOAST_EVENT, { detail: payload }));
}

export function subscribeToast(listener: (payload: ToastPayload) => void) {
  if (typeof window === "undefined") return () => undefined;

  const handler = (event: Event) => {
    listener((event as CustomEvent<ToastPayload>).detail);
  };

  window.addEventListener(TOAST_EVENT, handler);
  return () => window.removeEventListener(TOAST_EVENT, handler);
}
