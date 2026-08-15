export const strongPasswordHint =
  "Mật khẩu phải có ít nhất 8 ký tự, 1 chữ hoa, 1 chữ số và 1 ký tự đặc biệt.";

export const getStrongPasswordIssues = (password: string) => {
  const issues: string[] = [];

  if (password.length < 8) {
    issues.push("ít nhất 8 ký tự");
  }
  if (!/[A-Z]/.test(password)) {
    issues.push("1 chữ hoa");
  }
  if (!/\d/.test(password)) {
    issues.push("1 chữ số");
  }
  if (!/[^\p{L}\p{N}\s]/u.test(password)) {
    issues.push("1 ký tự đặc biệt");
  }
  if (/\s/.test(password)) {
    issues.push("không chứa khoảng trắng");
  }

  return issues;
};

export const formatStrongPasswordIssues = (password: string) => {
  const issues = getStrongPasswordIssues(password);
  return issues.length > 0
    ? `Mật khẩu mới còn thiếu: ${issues.join(", ")}.`
    : "";
};
