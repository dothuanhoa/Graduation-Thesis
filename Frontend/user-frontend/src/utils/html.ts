import DOMPurify from "dompurify";

const decodeHtmlEntities = (value: string) => {
  if (typeof document === "undefined") {
    return value
      .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
      .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)));
  }

  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
};

export const stripHtmlToText = (value = "") =>
  decodeHtmlEntities(
    value
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  )
    .replace(/\s+/g, " ")
    .trim();

export const sanitizeRichHtml = (value = "") =>
  DOMPurify.sanitize(value, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "rel", "style"],
  });
