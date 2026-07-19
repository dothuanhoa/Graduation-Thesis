import { Edit3, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DataTable, { type Column } from "../../../components/DataTable";
import FilterBar from "../../../components/FilterBar";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import type { StatusType, TableRow } from "../../../data/mockData";
import { notificationApi, type NotificationResponse } from "../../../services/api";
import { stripHtmlToText } from "../../../utils/html";
import { includesSearch } from "../../../utils/search";

type NotificationRow = TableRow & {
  id: string;
  title: string;
  priority: StatusType;
  target: string;
  status: StatusType;
  startDate: string;
  endDate: string;
};

const toInputDateTime = (value?: string) => {
  if (!value) return "";
  return value.slice(0, 16);
};

const toRow = (item: NotificationResponse): NotificationRow => ({
  id: item.id,
  title: item.title,
  priority: item.priority,
  target: item.targetType === "ALL" ? "Toàn trường" : `${item.targetType}${item.targetId ? `: ${item.targetId}` : ""}`,
  status: item.status || "DRAFT",
  startDate: toInputDateTime(item.startDate).replace("T", " "),
  endDate: toInputDateTime(item.endDate).replace("T", " "),
});

const columns: Column<NotificationRow>[] = [
  { header: "Tiêu đề", key: "title" },
  { header: "Ưu tiên", key: "priority", render: (row) => <StatusBadge status={row.priority} /> },
  { header: "Đối tượng", key: "target" },
  { header: "Bắt đầu", key: "startDate" },
  { header: "Trạng thái", key: "status", render: (row) => <StatusBadge status={row.status} /> },
];

function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [keyword, setKeyword] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [targetFilter, setTargetFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const data = await notificationApi.listAdmin();
      setNotifications(data);
    } catch (err) {
      setNotifications([]);
      setMessage(err instanceof Error ? err.message : "Không tải được danh sách thông báo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadNotifications();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadNotifications]);

  const revokeNotification = async (row: NotificationRow) => {
    if (!window.confirm(`Thu hồi thông báo "${row.title}"?`)) return;

    setMessage("");
    try {
      await notificationApi.revoke(row.id);
      setNotifications((current) => current.map((item) => (item.id === row.id ? { ...item, status: "REVOKED" } : item)));
      setMessage("Đã thu hồi thông báo.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không thu hồi được thông báo.");
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      const matchesKeyword = includesSearch(
        `${notification.title} ${stripHtmlToText(notification.content)} ${notification.targetId ?? ""}`,
        keyword,
      );
      const matchesPriority = !priorityFilter || notification.priority === priorityFilter;
      const matchesTarget = !targetFilter || notification.targetType === targetFilter;
      const matchesStatus = !statusFilter || (notification.status || "DRAFT") === statusFilter;
      return matchesKeyword && matchesPriority && matchesTarget && matchesStatus;
    });
  }, [keyword, notifications, priorityFilter, statusFilter, targetFilter]);

  const rows = filteredNotifications.map(toRow);

  return (
    <div className="space-y-gutter">
      <PageHeader
        title="Quản lý thông báo"
        subtitle="Tạo, cập nhật, xuất bản hoặc thu hồi thông báo gửi đến sinh viên."
      />

      <div className="flex flex-wrap gap-3">
        <Link className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary" to="/admin/notifications/new">
          <Plus className="h-5 w-5" />
          Tạo thông báo
        </Link>
        <button className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" onClick={loadNotifications} type="button">
          <RefreshCw className="h-5 w-5" />
          Tải lại
        </button>
      </div>

      {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">{message}</div>}

      <FilterBar
        filters={[
          {
            id: "priority",
            label: "Độ ưu tiên",
            value: priorityFilter,
            onChange: setPriorityFilter,
            options: [
              { value: "", label: "Tất cả độ ưu tiên" },
              { value: "NORMAL", label: "Bình thường" },
              { value: "URGENT", label: "Cấp bách" },
            ],
          },
          {
            id: "target",
            label: "Đối tượng",
            value: targetFilter,
            onChange: setTargetFilter,
            options: [
              { value: "", label: "Tất cả đối tượng" },
              { value: "ALL", label: "Toàn trường" },
              { value: "FACULTY", label: "Theo khoa" },
              { value: "CLASS", label: "Theo lớp" },
              { value: "USER", label: "Theo sinh viên" },
            ],
          },
          {
            id: "status",
            label: "Trạng thái",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "", label: "Tất cả trạng thái" },
              { value: "DRAFT", label: "Bản nháp" },
              { value: "PUBLISHED", label: "Đã đăng" },
              { value: "EXPIRED", label: "Hết hạn" },
              { value: "REVOKED", label: "Đã thu hồi" },
            ],
          },
        ]}
        onReset={() => {
          setKeyword("");
          setPriorityFilter("");
          setTargetFilter("");
          setStatusFilter("");
        }}
        onSearchChange={setKeyword}
        resultText={`Hiển thị ${filteredNotifications.length} / ${notifications.length} thông báo`}
        searchPlaceholder="Nhập tiêu đề, nội dung hoặc mã đối tượng"
        searchValue={keyword}
        title="Lọc danh sách thông báo"
      />

      {loading ? (
        <div className="panel p-6 text-on-surface-variant">Đang tải thông báo...</div>
      ) : (
        <DataTable
          actions={(row) => (
            <div className="flex justify-end gap-2">
              <Link className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-primary hover:bg-surface-container" to={`/admin/notifications/${row.id}/edit`}>
                <Edit3 className="h-4 w-4" />
                Sửa
              </Link>
              <button className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-error hover:bg-error-container" onClick={() => void revokeNotification(row)} type="button">
                <Trash2 className="h-4 w-4" />
                Thu hồi
              </button>
            </div>
          )}
          caption="Danh sách thông báo"
          columns={columns}
          rows={rows}
          selectable={false}
        />
      )}
    </div>
  );
}

export default AdminNotificationsPage;
