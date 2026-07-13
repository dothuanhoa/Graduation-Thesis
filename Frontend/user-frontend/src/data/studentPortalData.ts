import {
  Award,
  Bell,
  CalendarCheck,
  ClipboardCheck,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  NotebookTabs,
  QrCode,
  UserRound,
} from "lucide-react";
import type { ComponentType } from "react";
import type { StatusType } from "./mockData";

export type StudentNavItem = {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
};

export type StudentMetric = {
  label: string;
  value: string;
  helper: string;
  icon: ComponentType<{ className?: string }>;
  tone: "primary" | "success" | "warning" | "danger";
};

export type StudentExam = {
  id: string;
  title: string;
  window: string;
  duration: string;
  attempt: string;
  requirement: string;
  status: StatusType;
  score?: string;
};

export type StudentActivity = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  reward: string;
  seat: string;
  status: StatusType;
};

export type StudentCertificate = {
  id: string;
  code: string;
  type: string;
  createdAt: string;
  appointment: string;
  status: StatusType;
};

export type StudentNotice = {
  id: string;
  title: string;
  content?: string;
  attachmentUrl?: string;
  source: string;
  time: string;
  endTime?: string;
  priority: StatusType;
  isRead: boolean;
  fromApi?: boolean;
};

export const studentMainNav: StudentNavItem[] = [
  { label: "Tổng quan", path: "/student/dashboard", icon: LayoutDashboard },
  { label: "Hồ sơ", path: "/student/profile", icon: UserRound },
  { label: "Thông báo", path: "/student/notifications", icon: Bell },
  { label: "Kỳ thi", path: "/student/exams", icon: NotebookTabs },
  { label: "Hoạt động", path: "/student/activities", icon: CalendarCheck },
  { label: "Điểm danh", path: "/checker/scan", icon: QrCode },
  { label: "Đơn xác nhận", path: "/student/certificates", icon: FileCheck2 },
];

export const studentBottomNav: StudentNavItem[] = [
  { label: "Trang chủ", path: "/student/dashboard", icon: LayoutDashboard },
  { label: "Thông báo", path: "/student/notifications", icon: Bell },
  { label: "Kỳ thi", path: "/student/exams", icon: NotebookTabs },
  { label: "Hoạt động", path: "/student/activities", icon: CalendarCheck },
  { label: "Hồ sơ", path: "/student/profile", icon: UserRound },
];

export const studentMetrics: StudentMetric[] = [
  {
    label: "Điểm rèn luyện",
    value: "82",
    helper: "Học kỳ hiện tại",
    icon: Award,
    tone: "primary",
  },
  {
    label: "Kỳ thi mở",
    value: "2",
    helper: "Cần hoàn thành",
    icon: NotebookTabs,
    tone: "warning",
  },
  {
    label: "Hoạt động đã đăng ký",
    value: "5",
    helper: "3 hoạt động sắp diễn ra",
    icon: CalendarCheck,
    tone: "success",
  },
  {
    label: "Đơn đang xử lý",
    value: "1",
    helper: "Có lịch hẹn nhận giấy",
    icon: ClipboardCheck,
    tone: "danger",
  },
];

export const studentQuickActions = [
  {
    title: "Cập nhật hồ sơ",
    helper: "Số điện thoại và thông tin liên hệ",
    icon: UserRound,
    path: "/student/profile",
  },
  {
    title: "Làm bài thi",
    helper: "Xem các kỳ thi đang mở",
    icon: GraduationCap,
    path: "/student/exams",
  },
  {
    title: "Đăng ký hoạt động",
    helper: "Tích lũy điểm rèn luyện",
    icon: CalendarCheck,
    path: "/student/activities",
  },
  {
    title: "Gửi đơn xác nhận",
    helper: "Tạo yêu cầu giấy tờ",
    icon: FileCheck2,
    path: "/student/certificates/new",
  },
];

export const studentNoticeFallback: StudentNotice[] = [
  {
    id: "9001",
    content:
      "Sinh viên theo dõi thông báo và thực hiện đăng ký điểm rèn luyện trong thời hạn quy định. Các minh chứng cần được nộp đúng định dạng.",
    title: "Mở đăng ký điểm rèn luyện học kỳ 1",
    source: "Phòng Công tác sinh viên",
    time: "2 giờ trước",
    endTime: "30/06/2026",
    priority: "URGENT",
    isRead: false,
  },
  {
    id: "9002",
    content:
      "Nhà trường thông báo lịch nghỉ Tết Nguyên Đán và thời gian sinh viên quay lại học tập. Sinh viên cần theo dõi lịch học trên hệ thống.",
    title: "Lịch nghỉ Tết Nguyên Đán và kế hoạch học tập đầu năm",
    source: "Phòng Đào tạo",
    time: "Hôm qua",
    endTime: "15/02/2026",
    priority: "NORMAL",
    isRead: false,
  },
  {
    id: "9003",
    content:
      "Sinh viên đã tham gia hoạt động ngoại khóa vui lòng nộp minh chứng để được ghi nhận điểm rèn luyện.",
    title: "Nhắc nộp minh chứng hoạt động ngoại khóa",
    source: "Phòng Công tác sinh viên",
    time: "3 ngày trước",
    endTime: "28/06/2026",
    priority: "NORMAL",
    isRead: true,
  },
];

export const studentExams: StudentExam[] = [
  {
    id: "exam-rules",
    title: "Trắc nghiệm Quy chế học vụ",
    window: "01/07/2026 - 05/07/2026",
    duration: "30 phút",
    attempt: "1/2 lượt",
    requirement: "Hoàn thành trước khi đăng ký học phần",
    status: "ACTIVE",
  },
  {
    id: "exam-civic",
    title: "Sinh hoạt công dân đầu khóa",
    window: "10/07/2026 - 12/07/2026",
    duration: "30 phút",
    attempt: "0/1 lượt",
    requirement: "Bắt buộc với sinh viên chính quy",
    status: "UPCOMING",
  },
  {
    id: "exam-security",
    title: "An toàn thông tin cơ bản",
    window: "15/06/2026 - 18/06/2026",
    duration: "45 phút",
    attempt: "1/1 lượt",
    requirement: "Đã hoàn thành",
    status: "COMPLETED",
    score: "8.5/10",
  },
];

export const studentActivities: StudentActivity[] = [
  {
    id: "act-soft-skills",
    title: "Workshop Kỹ năng mềm",
    date: "15/10/2026",
    time: "08:00 - 11:30",
    location: "Hội trường A",
    reward: "+5 điểm",
    seat: "48/80 chỗ",
    status: "UPCOMING",
  },
  {
    id: "act-blood",
    title: "Hiến máu tình nguyện",
    date: "20/10/2026",
    time: "07:30 - 10:30",
    location: "Sân D3",
    reward: "+10 điểm",
    seat: "112/150 chỗ",
    status: "ONGOING",
  },
  {
    id: "act-career",
    title: "Ngày hội việc làm STU",
    date: "22/10/2026",
    time: "13:00 - 17:00",
    location: "Nhà thi đấu",
    reward: "+5 điểm",
    seat: "Không giới hạn",
    status: "UPCOMING",
  },
];

export const studentCertificates: StudentCertificate[] = [
  {
    id: "cert-001",
    code: "GXN-26001",
    type: "Xác nhận sinh viên",
    createdAt: "20/06/2026",
    appointment: "24/06/2026",
    status: "PROCESSING",
  },
  {
    id: "cert-002",
    code: "GXN-26002",
    type: "Vay vốn sinh viên",
    createdAt: "12/06/2026",
    appointment: "18/06/2026",
    status: "APPROVED",
  },
  {
    id: "cert-003",
    code: "GXN-26003",
    type: "Tạm hoãn nghĩa vụ quân sự",
    createdAt: "02/06/2026",
    appointment: "06/06/2026",
    status: "COMPLETED",
  },
];

export const profileTimeline = [
  {
    title: "Tạo hồ sơ sinh viên",
    time: "Khi import/tạo hồ sơ",
    status: "COMPLETED" as StatusType,
  },
  {
    title: "Cập nhật số điện thoại",
    time: "Sinh viên tự cập nhật",
    status: "PROCESSING" as StatusType,
  },
  {
    title: "Đối chiếu lớp và khoa",
    time: "Theo dữ liệu quản trị",
    status: "PENDING" as StatusType,
  },
];

export const toneClass: Record<StudentMetric["tone"], string> = {
  primary: "bg-primary text-on-primary",
  success: "bg-emerald-600 text-white",
  warning: "bg-amber-500 text-slate-950",
  danger: "bg-rose-600 text-white",
};
