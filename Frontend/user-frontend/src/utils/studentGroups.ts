import type { StudentGroupResponse } from "../services/api";

export const defaultStudentGroups: StudentGroupResponse[] = [
  { id: 1, code: "1", name: "Đầu khóa" },
  { id: 2, code: "2", name: "Giữa khóa" },
  { id: 3, code: "3", name: "Cuối khóa" },
];

export const studentGroupName = (code?: string, groups: StudentGroupResponse[] = defaultStudentGroups) => {
  const normalizedCode = String(code || "").trim();
  return groups.find((group) => group.code === normalizedCode || String(group.id) === normalizedCode)?.name || "Chưa xác định";
};
