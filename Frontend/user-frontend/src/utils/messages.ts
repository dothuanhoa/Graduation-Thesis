const serviceNamePattern = /\b(?:user|notification|activity|auth|certification)-service\b/gi;
const serviceWordPattern = /\bservice\b/gi;

export function sanitizeServiceMessage(message: string) {
  return message
    .replace(serviceNamePattern, "hệ thống")
    .replace(serviceWordPattern, "hệ thống")
    .replace(/\s+/g, " ")
    .trim();
}

function translateMessage(message: string) {
  const value = message.toLowerCase();

  if (value.includes("không tìm thấy")) return "Not found. Please check the information.";
  if (value.includes("không khớp")) return "The information does not match the existing record.";
  if (value.includes("không được để trống") || value.includes("vui lòng nhập") || value.includes("vui lòng chọn")) {
    return "Please complete the required information.";
  }
  if (value.includes("không có quyền") || value.includes("không được phân quyền")) return "You do not have permission to perform this action.";
  if (value.includes("đã tồn tại")) return "This record already exists.";
  if (value.includes("không thành công") || value.includes("thất bại") || value.includes("không ")) return "The action could not be completed. Please try again.";
  if (value.includes("thành công") || value.includes("đã ")) return "Action completed successfully.";

  return "Please check the information and try again.";
}

export function toUserFacingMessage(message: string) {
  const cleanMessage = sanitizeServiceMessage(message || "Thao tác không thành công.");
  return `${cleanMessage}\n${translateMessage(cleanMessage)}`;
}

export function toSuccessMessage(message = "Thao tác thành công.") {
  const cleanMessage = sanitizeServiceMessage(message);
  return `${cleanMessage}\n${translateMessage(cleanMessage)}`;
}
