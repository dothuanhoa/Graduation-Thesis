const serviceNamePattern =
  /\b(?:user|notification|activity|auth|certification)-service\b/gi;
const serviceWordPattern = /\bservice\b/gi;

export function sanitizeServiceMessage(message: string) {
  return message
    .replace(serviceNamePattern, "Hệ thống")
    .replace(serviceWordPattern, "Hệ thống")
    .replace(/\s+/g, " ")
    .trim();
}

export function toUserFacingMessage(message: string) {
  return sanitizeServiceMessage(message || "Thao tác không thành công.");
}

export function toSuccessMessage(message = "Thao tác thành công.") {
  return sanitizeServiceMessage(message);
}
