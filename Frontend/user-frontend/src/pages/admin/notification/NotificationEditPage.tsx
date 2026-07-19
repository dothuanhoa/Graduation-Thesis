import { RotateCcw, Save } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BackButton from "../../../components/BackButton";
import Card from "../../../components/Card";
import FormField from "../../../components/FormField";
import PageHeader from "../../../components/PageHeader";
import RichTextEditor from "../../../components/RichTextEditor";
import { notificationApi, type NotificationPayload, type NotificationResponse } from "../../../services/api";
import { notificationSchema } from "../../../validation/notificationSchemas";
import { getZodMessage } from "../../../validation/userSchemas";

const toInputDateTime = (value?: string) => {
  if (!value) return "";
  return value.slice(0, 16);
};

const toApiDateTime = (value: string) => (value.length === 16 ? `${value}:00` : value);

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

function NotificationEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<NotificationPayload | null>(null);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadNotification = useCallback(async () => {
    if (!id) {
      setMessage("Không tìm thấy thông báo cần chỉnh sửa.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const notifications = await notificationApi.listAdmin();
      const current = notifications.find((item) => String(item.id) === String(id));
      if (!current) {
        setFormData(null);
        setNotificationTitle("");
        setMessage("Không tìm thấy thông báo cần chỉnh sửa.");
        return;
      }
      setFormData(toPayload(current));
      setNotificationTitle(current.title);
    } catch (err) {
      setFormData(null);
      setMessage(err instanceof Error ? err.message : "Không tải được thông báo cần chỉnh sửa.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadNotification();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadNotification]);

  const updateField = (field: keyof NotificationPayload, value: string) => {
    setFormData((current) => (current ? { ...current, [field]: value } : current));
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || !formData) return;

    if (formData.targetType !== "ALL" && !formData.targetId?.trim()) {
      setMessage("Vui lòng nhập Target ID khi gửi theo khoa, lớp hoặc MSSV.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const validated = notificationSchema.parse(formData);
      const updated = await notificationApi.update(id, {
        ...validated,
        attachmentUrl: validated.attachmentUrl || undefined,
        targetId: validated.targetType === "ALL" ? undefined : validated.targetId,
        startDate: toApiDateTime(validated.startDate),
        endDate: toApiDateTime(validated.endDate),
      });
      setFormData(toPayload(updated));
      setNotificationTitle(updated.title);
      setMessage("Đã cập nhật thông báo.");
    } catch (err) {
      setMessage(getZodMessage(err, err instanceof Error ? err.message : "Không cập nhật được thông báo."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-gutter">
      <BackButton to="/admin/notifications">Quay lại danh sách</BackButton>

      <PageHeader
        title="Chỉnh sửa thông báo"
        subtitle={notificationTitle ? `Cập nhật nội dung và trạng thái của thông báo ${notificationTitle}.` : "Cập nhật nội dung, đối tượng nhận và thời gian hiển thị thông báo."}
      />

      {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">{message}</div>}

      {loading ? (
        <div className="panel p-6 text-on-surface-variant">Đang tải thông báo...</div>
      ) : formData ? (
        <Card>
          <form className="grid gap-5 md:grid-cols-2" onSubmit={handleUpdate}>
            <FormField label="Tiêu đề" onChange={(event) => updateField("title", event.target.value)} required value={formData.title} />
            <FormField
              as="select"
              label="Độ ưu tiên"
              onChange={(event) => updateField("priority", event.target.value)}
              options={["NORMAL", "URGENT"]}
              value={formData.priority}
            />
            <FormField
              as="select"
              label="Đối tượng nhận"
              onChange={(event) => updateField("targetType", event.target.value)}
              options={["ALL", "FACULTY", "CLASS", "USER"]}
              value={formData.targetType}
            />
            <FormField
              label="Target ID"
              onChange={(event) => updateField("targetId", event.target.value)}
              placeholder="Bỏ trống nếu gửi toàn trường"
              value={formData.targetId}
            />
            <FormField
              label="Bắt đầu hiển thị"
              onChange={(event) => updateField("startDate", event.target.value)}
              required
              type="datetime-local"
              value={formData.startDate}
            />
            <FormField
              label="Hết hạn"
              onChange={(event) => updateField("endDate", event.target.value)}
              required
              type="datetime-local"
              value={formData.endDate}
            />
            <FormField as="select" label="Trạng thái" onChange={(event) => updateField("status", event.target.value)} options={["DRAFT", "PUBLISHED", "EXPIRED", "REVOKED"]} value={formData.status} />
            <FormField label="Tệp đính kèm URL" onChange={(event) => updateField("attachmentUrl", event.target.value)} value={formData.attachmentUrl} />
            <RichTextEditor
              className="md:col-span-2"
              hint="Nội dung sẽ hiển thị đúng định dạng ở trang sinh viên."
              label="Nội dung thông báo"
              onChange={(value) => updateField("content", value)}
              required
              value={formData.content}
            />
            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary disabled:opacity-60" disabled={saving} type="submit">
                <Save className="h-5 w-5" />
                {saving ? "Đang lưu" : "Lưu thay đổi"}
              </button>
              <button className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" onClick={() => navigate("/admin/notifications")} type="button">
                <RotateCcw className="h-5 w-5" />
                Hủy
              </button>
            </div>
          </form>
        </Card>
      ) : (
        <Card>
          <p className="text-sm font-semibold text-on-surface-variant">Không có dữ liệu thông báo để chỉnh sửa.</p>
        </Card>
      )}
    </div>
  );
}

export default NotificationEditPage;
