import { emitToast } from "./toastBus";

export const scrollToElement = (element: HTMLElement | null) => {
  window.requestAnimationFrame(() => {
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
};

export const scrollToFormMessage = (target?: HTMLElement | null) => {
  window.requestAnimationFrame(() => {
    scrollToElement(target ?? document.querySelector("[data-form-message]"));
  });
};

export const reportFormError = (
  message: string,
  target?: HTMLElement | null,
) => {
  emitToast({ variant: "error", message });
  scrollToFormMessage(target);
};
