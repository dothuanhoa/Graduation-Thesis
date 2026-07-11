import type { ActivityCategory, ActivityParticipationType, ActivityResponse, ActivityStatus } from "../services/api";

export const activityCategoryLabels: Record<ActivityCategory, string> = {
  ACADEMIC: "Học thuật",
  MOVEMENT: "Phong trào",
  FACULTY: "Cấp khoa",
  UNIVERSITY: "Cấp trường",
  OTHER: "Khác",
};

export const activityStatusLabels: Record<ActivityStatus, string> = {
  UPCOMING: "Sắp diễn ra",
  ONGOING: "Đang diễn ra",
  COMPLETED: "Đã hoàn thành",
};

export const activityParticipationLabels: Record<ActivityParticipationType, string> = {
  LIMITED: "Giới hạn đăng ký",
  OPEN: "Tự do tham gia",
};

export const toInputDateTime = (value?: string) => {
  if (!value) return "";
  return value.slice(0, 16);
};

export const toApiDateTime = (value: string) => (value.length === 16 ? `${value}:00` : value);

export const formatDateTime = (value?: string) => {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace("T", " ");
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

export const formatActivityRange = (startTime?: string, endTime?: string) => {
  if (!startTime && !endTime) return "Chưa cập nhật thời gian";
  return `${formatDateTime(startTime)} - ${formatDateTime(endTime)}`;
};

export const isActivityScanActive = (activity: Pick<ActivityResponse, "endTime" | "status">, now = new Date()) => {
  if (activity.status === "COMPLETED") return false;

  const endTime = new Date(activity.endTime || "");
  if (Number.isNaN(endTime.getTime())) return true;

  return endTime.getTime() >= now.getTime();
};
