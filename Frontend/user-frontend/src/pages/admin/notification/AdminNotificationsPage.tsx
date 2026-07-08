import { Edit3, Plus, RefreshCw, RotateCcw, Save, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Card from "../../../components/Card";
import DataTable, { type Column } from "../../../components/DataTable";
import FormField from "../../../components/FormField";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import type { StatusType, TableRow } from "../../../data/mockData";
import { notificationApi, type NotificationPayload, type NotificationResponse } from "../../../services/api";
import { notificationSchema } from "../../../validation/notificationSchemas";
import { getZodMessage } from "../../../validation/userSchemas";

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

const toApiDateTime = (value: string) => (value.length === 16 ? `${value}:00` : value);

const toRow = (item: NotificationResponse): NotificationRow => ({
  id: item.id,
  title: item.title,
  priority: item.priority,
  target: item.targetType === "ALL" ? "Toàn trường" : `${item.targetType}${item.targetId ? `: ${item.targetId}` : ""}`,
  status: item.status || "DRAFT",
  startDate: toInputDateTime(item.startDate).replace("T", " "),
  endDate: toInputDateTime(item.endDate).replace("T", " "),
});

const toPayload = (item: NotificationResponse): NotificationPayload => ({
  title: item.title,
  content: item.content,
  attachmentUrl: item.attachmentUrl || "",
  priority: item.priority,
  targetType: item.targetType,
  targetId: item.targetId || "",
  startDate: toInputDateTime(item.startDate),
  endDate: toInputDateTime(item.endDate),
  status: item.status || "DRAFT",
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
  const [editing, setEditing] = useState<NotificationResponse | null>(null);
  const [formData, setFormData] = useState<NotificationPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

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

  const startEdit = (row: NotificationRow) => {
    const item = notifications.find((notification) => notification.id === row.id);
    if (!item) return;
    setEditing(item);
    setFormData(toPayload(item));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateField = (field: keyof NotificationPayload, value: string) => {
    setFormData((current) => (current ? { ...current, [field]: value } : current));
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing || !formData) return;

    if (formData.targetType !== "ALL" && !formData.targetId?.trim()) {
      setMessage("Vui lòng nhập Target ID khi gửi theo khoa, lớp hoặc MSSV.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const validated = notificationSchema.parse(formData);
      const updated = await notificationApi.update(editing.id, {
        ...validated,
        attachmentUrl: validated.attachmentUrl || undefined,
        targetId: validated.targetType === "ALL" ? undefined : validated.targetId,
        startDate: toApiDateTime(validated.startDate),
        endDate: toApiDateTime(validated.endDate),
      });
      setNotifications((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setEditing(null);
      setFormData(null);
      setMessage("Đã cập nhật thông báo.");
    } catch (err) {
      setMessage(getZodMessage(err, err instanceof Error ? err.message : "Không cập nhật được thông báo."));
    } finally {
      setSaving(false);
    }
  };

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

  const rows = notifications.map(toRow);

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

      {editing && formData && (
        <Card>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary">Chỉnh sửa thông báo</p>
              <h2 className="text-xl font-bold text-on-surface">{editing.title}</h2>
            </div>
            <button className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container" onClick={() => setEditing(null)} type="button">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form className="grid gap-5 md:grid-cols-2" onSubmit={handleUpdate}>
            <FormField label="Tiêu đề" onChange={(event) => updateField("title", event.target.value)} required value={formData.title} />
            <FormField as="select" label="Độ ưu tiên" onChange={(event) => updateField("priority", event.target.value)} options={["NORMAL", "URGENT"]} value={formData.priority} />
            <FormField as="select" label="Đối tượng nhận" onChange={(event) => updateField("targetType", event.target.value)} options={["ALL", "FACULTY", "CLASS", "USER"]} value={formData.targetType} />
            <FormField label="Target ID" onChange={(event) => updateField("targetId", event.target.value)} value={formData.targetId} />
            <FormField label="Bắt đầu hiển thị" onChange={(event) => updateField("startDate", event.target.value)} required type="datetime-local" value={formData.startDate} />
            <FormField label="Hết hạn" onChange={(event) => updateField("endDate", event.target.value)} required type="datetime-local" value={formData.endDate} />
            <FormField as="select" label="Trạng thái" onChange={(event) => updateField("status", event.target.value)} options={["DRAFT", "PUBLISHED", "EXPIRED", "REVOKED"]} value={formData.status} />
            <FormField label="Tệp đính kèm URL" onChange={(event) => updateField("attachmentUrl", event.target.value)} value={formData.attachmentUrl} />
            <div className="md:col-span-2">
              <FormField as="textarea" label="Nội dung HTML" onChange={(event) => updateField("content", event.target.value)} required value={formData.content} />
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary disabled:opacity-60" disabled={saving} type="submit">
                <Save className="h-5 w-5" />
                {saving ? "Đang lưu" : "Lưu thay đổi"}
              </button>
              <button className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" onClick={() => setEditing(null)} type="button">
                <RotateCcw className="h-5 w-5" />
                Hủy
              </button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="panel p-6 text-on-surface-variant">Đang tải thông báo...</div>
      ) : (
        <DataTable
          actions={(row) => (
            <div className="flex justify-end gap-2">
              <button className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-primary hover:bg-surface-container" onClick={() => startEdit(row)} type="button">
                <Edit3 className="h-4 w-4" />
                Sửa
              </button>
              <button className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-error hover:bg-error-container" onClick={() => void revokeNotification(row)} type="button">
                <Trash2 className="h-4 w-4" />
                Thu hồi
              </button>
            </div>
          )}
          caption="Danh sách thông báo"
          columns={columns}
          rows={rows}
        />
      )}
    </div>
  );
}

export default AdminNotificationsPage;
