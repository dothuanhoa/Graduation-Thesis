import type { StatusType } from "../data/mockData";

const statusLabel: Record<StatusType, string> = {
  ACTIVE: "Hoạt động",
  INACTIVE: "Ngưng",
  DRAFT: "Nháp",
  PUBLISHED: "Đã xuất bản",
  PENDING: "Chờ duyệt",
  PROCESSING: "Đang xử lý",
  PRINTED: "Đã in",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  COMPLETED: "Hoàn tất",
  UPCOMING: "Sắp diễn ra",
  ONGOING: "Đang diễn ra",
  STUDYING: "Đang học",
  RESERVED: "Bảo lưu",
  SUSPENDED: "Đình chỉ",
  GRADUATED: "Đã tốt nghiệp",
  URGENT: "Cấp bách",
  NORMAL: "Bình thường",
  EXPIRED: "Hết hạn",
  REVOKED: "Đã thu hồi",
  CANCELLED: "Đã hủy",
  NEEDS_INFO: "Cần thông tin",
};

const statusTone: Record<StatusType, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  INACTIVE: "bg-slate-200 text-slate-700",
  DRAFT: "bg-slate-100 text-slate-700",
  PUBLISHED: "bg-blue-100 text-blue-700",
  PENDING: "bg-amber-100 text-amber-800",
  PROCESSING: "bg-indigo-100 text-indigo-700",
  PRINTED: "bg-cyan-100 text-cyan-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  COMPLETED: "bg-slate-200 text-slate-700",
  UPCOMING: "bg-blue-100 text-blue-700",
  ONGOING: "bg-emerald-100 text-emerald-700",
  STUDYING: "bg-emerald-100 text-emerald-700",
  RESERVED: "bg-amber-100 text-amber-800",
  SUSPENDED: "bg-red-100 text-red-700",
  GRADUATED: "bg-slate-200 text-slate-700",
  URGENT: "bg-red-100 text-red-700",
  NORMAL: "bg-surface-container-high text-on-surface-variant",
  EXPIRED: "bg-amber-100 text-amber-800",
  REVOKED: "bg-slate-200 text-slate-700",
  CANCELLED: "bg-slate-200 text-slate-700",
  NEEDS_INFO: "bg-amber-100 text-amber-800",
};

type StatusBadgeProps = {
  status: StatusType;
};

function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusTone[status]}`}>
      {statusLabel[status]}
    </span>
  );
}

export default StatusBadge;
