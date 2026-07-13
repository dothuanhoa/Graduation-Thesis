import {
  Activity,
  Award,
  Bell,
  BookOpenCheck,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  NotebookTabs,
  UserCog,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";

export type StatusType =
  | "ACTIVE"
  | "INACTIVE"
  | "DRAFT"
  | "PUBLISHED"
  | "PENDING"
  | "PROCESSING"
  | "APPROVED"
  | "REJECTED"
  | "COMPLETED"
  | "UPCOMING"
  | "ONGOING"
  | "STUDYING"
  | "RESERVED"
  | "SUSPENDED"
  | "GRADUATED"
  | "URGENT"
  | "NORMAL"
  | "EXPIRED"
  | "REVOKED"
  | "CANCELLED"
  | "NEEDS_INFO";

export type NavItem = {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
};

export type ModuleMeta = {
  title: string;
  subtitle: string;
  module: string;
  kind: "dashboard" | "table" | "form" | "detail" | "report" | "settings";
  actionLabel?: string;
};

export type TableRow = Record<string, string | number | StatusType>;

export const adminNav: NavItem[] = [
  { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Khoa", path: "/admin/faculties", icon: Building2 },
  { label: "Niên khóa", path: "/admin/academic-years", icon: BookOpenCheck },
  { label: "Lớp", path: "/admin/classes", icon: GraduationCap },
  { label: "Sinh viên", path: "/admin/students", icon: Users },
  { label: "Thông báo", path: "/admin/notifications", icon: Bell },
  { label: "Kỳ thi", path: "/admin/exams", icon: NotebookTabs },
  { label: "Hoạt động", path: "/admin/activities", icon: CalendarCheck },
  { label: "Đơn từ", path: "/admin/certificates", icon: FileCheck2 },
];

export const studentNav: NavItem[] = [
  { label: "Trang chủ", path: "/student/dashboard", icon: LayoutDashboard },
  { label: "Kỳ thi", path: "/student/exams", icon: NotebookTabs },
  { label: "Hoạt động", path: "/student/activities", icon: CalendarCheck },
  { label: "Đơn từ", path: "/student/certificates", icon: FileCheck2 },
  { label: "Cá nhân", path: "/student/profile", icon: UserCog },
];

export const adminStats = [
  {
    label: "Tổng số sinh viên",
    value: "15,234",
    trend: "+2.4%",
    icon: Users,
    tone: "primary",
  },
  {
    label: "Thông báo mới",
    value: "12",
    trend: "3 cấp bách",
    icon: Bell,
    tone: "info",
  },
  {
    label: "Đơn chờ duyệt",
    value: "45",
    trend: "Cần xử lý",
    icon: ClipboardCheck,
    tone: "warning",
  },
  {
    label: "Hoạt động tuần này",
    value: "8",
    trend: "2 đang diễn ra",
    icon: CalendarCheck,
    tone: "success",
  },
];

export const students = [
  {
    id: "SV001",
    studentCode: "20210001",
    name: "Nguyễn Văn An",
    className: "K64-CNPM",
    faculty: "Công nghệ thông tin",
    status: "STUDYING" as StatusType,
  },
  {
    id: "SV002",
    studentCode: "20210028",
    name: "Trần Thị Bình",
    className: "K63-NNA",
    faculty: "Ngoại ngữ",
    status: "GRADUATED" as StatusType,
  },
  {
    id: "SV003",
    studentCode: "20209012",
    name: "Lê Hoàng",
    className: "K65-KTQD",
    faculty: "Kinh tế",
    status: "RESERVED" as StatusType,
  },
  {
    id: "SV004",
    studentCode: "20220045",
    name: "Phạm Minh Đức",
    className: "K66-ATTT",
    faculty: "Công nghệ thông tin",
    status: "STUDYING" as StatusType,
  },
];

export const faculties: TableRow[] = [
  {
    code: "CNTT",
    name: "Công nghệ thông tin",
    manager: "TS. Lê Minh",
    students: 4280,
    status: "ACTIVE",
  },
  {
    code: "QTKD",
    name: "Quản trị kinh doanh",
    manager: "ThS. Nguyễn Lan",
    students: 2310,
    status: "ACTIVE",
  },
  {
    code: "NNA",
    name: "Ngoại ngữ",
    manager: "ThS. Trần Mai",
    students: 1480,
    status: "ACTIVE",
  },
];

export const classes: TableRow[] = [
  {
    code: "K64-CNPM",
    faculty: "CNTT",
    year: "2021-2025",
    students: 72,
    status: "ACTIVE",
  },
  {
    code: "K65-ATTT",
    faculty: "CNTT",
    year: "2022-2026",
    students: 64,
    status: "ACTIVE",
  },
  {
    code: "K63-NNA",
    faculty: "NNA",
    year: "2020-2024",
    students: 58,
    status: "INACTIVE",
  },
];

export const notifications: TableRow[] = [
  {
    title: "Mở đăng ký điểm rèn luyện học kỳ 1",
    target: "Toàn trường",
    priority: "URGENT",
    status: "PUBLISHED",
  },
  {
    title: "Lịch nghỉ Tết Nguyên Đán",
    target: "Sinh viên",
    priority: "NORMAL",
    status: "DRAFT",
  },
  {
    title: "Nộp minh chứng hoạt động",
    target: "Khoa CNTT",
    priority: "URGENT",
    status: "PUBLISHED",
  },
];

export const exams: TableRow[] = [
  {
    title: "Trắc nghiệm Quy chế học vụ",
    window: "01/07 - 05/07",
    duration: "30 phút",
    status: "ACTIVE",
  },
  {
    title: "Kiểm tra Sinh hoạt công dân",
    window: "10/07 - 12/07",
    duration: "30 phút",
    status: "UPCOMING",
  },
  {
    title: "An toàn thông tin cơ bản",
    window: "15/06 - 18/06",
    duration: "45 phút",
    status: "COMPLETED",
  },
];

export const activities: TableRow[] = [
  {
    title: "Workshop Kỹ năng mềm",
    time: "15/10 08:00",
    location: "Hội trường A",
    reward: "+5",
    status: "UPCOMING",
  },
  {
    title: "Hiến máu tình nguyện",
    time: "20/10 07:30",
    location: "Sân D3",
    reward: "+10",
    status: "ONGOING",
  },
  {
    title: "Ngày hội việc làm STU",
    time: "22/10 13:00",
    location: "Nhà thi đấu",
    reward: "+5",
    status: "COMPLETED",
  },
];

export const certificates: TableRow[] = [
  {
    code: "GXN-24001",
    student: "Nguyễn Văn An",
    type: "Hoãn nghĩa vụ quân sự",
    createdAt: "20/06/2026",
    status: "PENDING",
  },
  {
    code: "GXN-24002",
    student: "Trần Thị Bình",
    type: "Vay vốn sinh viên",
    createdAt: "18/06/2026",
    status: "PROCESSING",
  },
  {
    code: "GXN-24003",
    student: "Lê Hoàng",
    type: "Xác nhận sinh viên",
    createdAt: "16/06/2026",
    status: "APPROVED",
  },
];

export const rewards: TableRow[] = [
  {
    code: "KT-001",
    student: "Nguyễn Văn An",
    title: "Sinh viên 5 tốt cấp trường",
    date: "12/06/2026",
    status: "APPROVED",
  },
  {
    code: "KT-002",
    student: "Phạm Minh Đức",
    title: "Thành tích nghiên cứu khoa học",
    date: "08/06/2026",
    status: "PENDING",
  },
];

export const discipline: TableRow[] = [
  {
    code: "KL-001",
    student: "Lê Hoàng",
    reason: "Vắng sinh hoạt công dân",
    level: "Nhắc nhở",
    status: "PROCESSING",
  },
  {
    code: "KL-002",
    student: "Trần Quốc Việt",
    reason: "Vi phạm quy chế thi",
    level: "Cảnh cáo",
    status: "COMPLETED",
  },
];

export const auditLogs: TableRow[] = [
  {
    actor: "admin",
    action: "Tạo thông báo",
    target: "TB-2026-12",
    time: "08:30 23/06/2026",
    status: "COMPLETED",
  },
  {
    actor: "ctsv01",
    action: "Duyệt đơn",
    target: "GXN-24003",
    time: "09:12 23/06/2026",
    status: "APPROVED",
  },
  {
    actor: "checker02",
    action: "Điểm danh",
    target: "HD-001",
    time: "10:05 23/06/2026",
    status: "COMPLETED",
  },
];

export const adminModuleMeta: Record<string, ModuleMeta> = {
  statistics: {
    title: "Dashboard thống kê tổng quan",
    subtitle: "Theo dõi các chỉ số vận hành trọng tâm của Phòng CTSV.",
    module: "Thống kê",
    kind: "report",
  },
  faculties: {
    title: "Quản lý Khoa",
    subtitle: "Khởi tạo và quản lý danh mục khoa trước khi tạo lớp.",
    module: "Tổ chức",
    kind: "table",
    actionLabel: "Thêm khoa",
  },
  classes: {
    title: "Quản lý Lớp học",
    subtitle: "Quản lý lớp theo khoa, niên khóa và trạng thái hoạt động.",
    module: "Tổ chức",
    kind: "table",
    actionLabel: "Thêm lớp",
  },
  studentsNew: {
    title: "Thêm sinh viên thủ công",
    subtitle: "Tạo hồ sơ sinh viên và khởi tạo tài khoản đăng nhập.",
    module: "Sinh viên",
    kind: "form",
  },
  studentsImport: {
    title: "Import sinh viên từ Excel",
    subtitle: "Tải file theo mẫu, validate dữ liệu và tạo tài khoản hàng loạt.",
    module: "Sinh viên",
    kind: "form",
  },
  studentDetail: {
    title: "Chi tiết hồ sơ sinh viên",
    subtitle: "Xem hồ sơ, trạng thái học tập và lịch sử xử lý.",
    module: "Sinh viên",
    kind: "detail",
  },
  notifications: {
    title: "Quản lý thông báo",
    subtitle: "Tạo, xuất bản và thu hồi thông báo theo đối tượng nhận.",
    module: "Thông báo",
    kind: "table",
    actionLabel: "Tạo thông báo",
  },
  notificationNew: {
    title: "Tạo thông báo mới",
    subtitle: "Soạn nội dung, chọn độ ưu tiên và định tuyến thông báo.",
    module: "Thông báo",
    kind: "form",
  },
  exams: {
    title: "Quản lý kỳ thi",
    subtitle: "Thiết lập khung giờ, thời lượng và trạng thái kỳ thi.",
    module: "Kỳ thi",
    kind: "table",
    actionLabel: "Tạo kỳ thi",
  },
  questions: {
    title: "Ngân hàng câu hỏi",
    subtitle: "Quản lý câu hỏi và đáp án trắc nghiệm theo từng kỳ thi.",
    module: "Kỳ thi",
    kind: "table",
    actionLabel: "Import câu hỏi",
  },
  examResults: {
    title: "Kết quả kỳ thi",
    subtitle: "Theo dõi điểm số, lượt nộp bài và số lần vi phạm.",
    module: "Kỳ thi",
    kind: "report",
  },
  activities: {
    title: "Quản lý hoạt động",
    subtitle: "Tạo sự kiện, import đăng ký và theo dõi trạng thái.",
    module: "Hoạt động",
    kind: "table",
    actionLabel: "Tạo hoạt động",
  },
  activityNew: {
    title: "Tạo hoạt động mới",
    subtitle: "Cấu hình hoạt động, điểm rèn luyện và link Google Forms.",
    module: "Hoạt động",
    kind: "form",
  },
  activityDetail: {
    title: "Chi tiết hoạt động đăng ký",
    subtitle: "Danh sách đăng ký hợp lệ, checker và dữ liệu điểm danh.",
    module: "Hoạt động",
    kind: "detail",
  },
  attendance: {
    title: "Quản lý điểm danh",
    subtitle: "Theo dõi tiến độ check-in theo từng sự kiện.",
    module: "Hoạt động",
    kind: "report",
  },
  activitySummary: {
    title: "Tổng kết hoạt động",
    subtitle: "Chốt danh sách có mặt, vắng mặt và xuất báo cáo.",
    module: "Hoạt động",
    kind: "report",
  },
  certificates: {
    title: "Quản lý đơn giấy xác nhận",
    subtitle: "Tiếp nhận, xét duyệt và hẹn lịch trả kết quả.",
    module: "Đơn từ",
    kind: "table",
  },
  certificateDetail: {
    title: "Chi tiết đơn giấy xác nhận",
    subtitle: "Xử lý trạng thái, lý do từ chối và lịch hẹn nhận giấy.",
    module: "Đơn từ",
    kind: "detail",
  },
  appointments: {
    title: "Lịch hẹn trả kết quả",
    subtitle: "Danh sách sinh viên đến nhận giấy theo ngày hẹn.",
    module: "Đơn từ",
    kind: "table",
  },
  handover: {
    title: "Hoàn tất bàn giao giấy",
    subtitle: "Xác nhận sinh viên đã nhận giấy tờ vật lý tại văn phòng.",
    module: "Đơn từ",
    kind: "form",
  },
  reportsStudents: {
    title: "Báo cáo thống kê sinh viên",
    subtitle: "Phân tích số lượng sinh viên theo khoa, lớp và trạng thái.",
    module: "Báo cáo",
    kind: "report",
  },
  reportsExams: {
    title: "Báo cáo thống kê kỳ thi",
    subtitle: "Tổng hợp lượt thi, điểm trung bình và tỷ lệ hoàn thành.",
    module: "Báo cáo",
    kind: "report",
  },
  reportsActivities: {
    title: "Báo cáo hoạt động ngoại khóa",
    subtitle: "Đo lường đăng ký, tham dự và điểm rèn luyện tích lũy.",
    module: "Báo cáo",
    kind: "report",
  },
  settings: {
    title: "Cài đặt hệ thống",
    subtitle: "Quản lý thông tin trường, thông báo hệ thống và tích hợp.",
    module: "Cài đặt",
    kind: "settings",
  },
  roles: {
    title: "Quản lý phân quyền vai trò",
    subtitle: "Thiết lập quyền truy cập theo nhóm người dùng nội bộ.",
    module: "Cài đặt",
    kind: "table",
  },
  users: {
    title: "Quản lý người dùng nội bộ",
    subtitle: "Tài khoản chuyên viên CTSV, quản trị và checker.",
    module: "Cài đặt",
    kind: "table",
  },
  auditLogs: {
    title: "Nhật ký hoạt động hệ thống",
    subtitle: "Theo dõi thao tác quan trọng để phục vụ audit.",
    module: "Cài đặt",
    kind: "table",
  },
  rewards: {
    title: "Quản lý khen thưởng",
    subtitle: "Theo dõi hồ sơ khen thưởng và danh hiệu sinh viên.",
    module: "Khen thưởng",
    kind: "table",
  },
  discipline: {
    title: "Quản lý kỷ luật",
    subtitle: "Theo dõi hồ sơ kỷ luật và mức xử lý.",
    module: "Kỷ luật",
    kind: "table",
  },
  rewardCriteria: {
    title: "Thiết lập tiêu chí khen thưởng",
    subtitle: "Cấu hình tiêu chí xét danh hiệu, thang điểm và minh chứng.",
    module: "Khen thưởng",
    kind: "settings",
  },
  rewardDetail: {
    title: "Chi tiết khen thưởng/kỷ luật",
    subtitle: "Xem quyết định, minh chứng và tiến trình xét duyệt.",
    module: "Khen thưởng",
    kind: "detail",
  },
};

export const studentModuleMeta: Record<string, ModuleMeta> = {
  profile: {
    title: "Hồ sơ cá nhân",
    subtitle: "Cập nhật thông tin liên hệ và theo dõi trạng thái sinh viên.",
    module: "Cá nhân",
    kind: "form",
  },
  notifications: {
    title: "Danh sách thông báo",
    subtitle: "Thông báo mới nhất từ nhà trường và Phòng CTSV.",
    module: "Thông báo",
    kind: "table",
  },
  notificationDetail: {
    title: "Chi tiết thông báo",
    subtitle: "Nội dung thông báo, tệp đính kèm và trạng thái đã đọc.",
    module: "Thông báo",
    kind: "detail",
  },
  exams: {
    title: "Danh sách kỳ thi",
    subtitle: "Các bài kiểm tra quy chế và sinh hoạt công dân.",
    module: "Kỳ thi",
    kind: "table",
  },
  examInstruction: {
    title: "Hướng dẫn trước khi thi",
    subtitle: "Quy định làm bài, chống gian lận và kiểm tra thiết bị.",
    module: "Kỳ thi",
    kind: "detail",
  },
  examResult: {
    title: "Kết quả kỳ thi",
    subtitle: "Điểm số, đáp án và thời điểm nộp bài.",
    module: "Kỳ thi",
    kind: "report",
  },
  activities: {
    title: "Danh sách hoạt động",
    subtitle: "Hoạt động ngoại khóa và điểm rèn luyện có thể đăng ký.",
    module: "Hoạt động",
    kind: "table",
  },
  activityDetail: {
    title: "Chi tiết hoạt động",
    subtitle: "Thời gian, địa điểm, điểm cộng và trạng thái đăng ký.",
    module: "Hoạt động",
    kind: "detail",
  },
  certificates: {
    title: "Yêu cầu giấy xác nhận",
    subtitle: "Theo dõi các đơn đã gửi và lịch hẹn nhận kết quả.",
    module: "Đơn từ",
    kind: "table",
  },
  certificateNew: {
    title: "Tạo yêu cầu giấy xác nhận",
    subtitle: "Chọn loại giấy, nhập mục đích sử dụng và gửi xét duyệt.",
    module: "Đơn từ",
    kind: "form",
  },
};

export const upcomingActivities = [
  {
    title: "Hội thảo Kỹ năng lãnh đạo sinh viên",
    date: "15",
    month: "TH 10",
    time: "08:00 - 11:30",
    capacity: "50 slots",
  },
  {
    title: "Ngày hội việc làm STU",
    date: "18",
    month: "TH 10",
    time: "07:30 - 17:00",
    capacity: "Không giới hạn",
  },
  {
    title: "Cuộc thi Logic trẻ",
    date: "22",
    month: "TH 10",
    time: "13:00 - 17:00",
    capacity: "Đầy",
  },
];

export const quickActions = [
  { title: "Đăng ký HĐ", icon: CalendarCheck, path: "/student/activities" },
  { title: "Xem điểm", icon: GraduationCap, path: "/student/exams" },
  { title: "Gửi đơn", icon: FileCheck2, path: "/student/certificates/new" },
];

export const studentNotifications = [
  {
    title: "Lịch nghỉ Tết Nguyên Đán và kế hoạch học tập đầu năm",
    source: "Phòng Đào tạo",
    time: "2 giờ trước",
  },
  {
    title: "Thông báo nộp học phí học kỳ II năm học 2023-2024",
    source: "Phòng Kế hoạch Tài chính",
    time: "Hôm qua",
  },
  {
    title: "Mở đăng ký điểm rèn luyện học kỳ 1",
    source: "Phòng CTSV",
    time: "3 ngày trước",
  },
];

export const mobileActivities = [
  {
    title: "Workshop Kỹ năng mềm",
    date: "15/10/2023",
    time: "08:00",
    location: "Hội trường A",
    reward: "+5",
  },
  {
    title: "Hiến máu tình nguyện",
    date: "20/10/2023",
    time: "07:30",
    location: "Sân D3",
    reward: "+10",
  },
];

export const pageDatasets = {
  faculties,
  classes,
  notifications,
  exams,
  activities,
  certificates,
  rewards,
  discipline,
  auditLogs,
};

export const adminIconMap = {
  Activity,
  Award,
  Bell,
  BookOpenCheck,
  ListChecks,
  MessageSquare,
};
