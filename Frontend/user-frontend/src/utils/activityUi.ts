import type { ActivityCategory, ActivityParticipationType, ActivityResponse, ActivityStatus } from "../services/api";
import { formatVietnamDateTime, toApiLocalDateTime, toDateTimeLocalInput } from "./dateTime";

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

export const toInputDateTime = toDateTimeLocalInput;

export const toApiDateTime = toApiLocalDateTime;

export const formatDateTime = (value?: string) => {
  return formatVietnamDateTime(value, "Chưa cập nhật");
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
