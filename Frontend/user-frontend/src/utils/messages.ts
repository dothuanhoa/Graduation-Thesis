const serviceNamePattern =
  /\b(?:user|notification|activity|auth|certification)-service\b/gi;
const serviceWordPattern = /\bservice\b/gi;

export function sanitizeServiceMessage(message: string) {
  return message
    .replace(serviceNamePattern, "hệ thống")
    .replace(serviceWordPattern, "hệ thống")
    .replace(/\s+/g, " ")
    .trim();
}

export function toUserFacingMessage(message: string) {
  return sanitizeServiceMessage(message || "Thao tác không thành công.");
}

export function toSuccessMessage(message = "Thao tác thành công.") {
  return sanitizeServiceMessage(message);
}
