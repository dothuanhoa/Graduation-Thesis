import { Send } from "lucide-react";
import { useState, type FormEvent } from "react";
import Card from "../../../components/Card";
import FormField from "../../../components/FormField";
import PageHeader from "../../../components/PageHeader";
import { notificationApi, type NotificationPayload } from "../../../services/api";
import { notificationSchema } from "../../../validation/notificationSchemas";
import { getZodMessage } from "../../../validation/userSchemas";

const toApiDateTime = (value: string) => (value.length === 16 ? `${value}:00` : value);

function NotificationCreatePage() {
  const [formData, setFormData] = useState<NotificationPayload>({
    title: "",
    content: "",
    attachmentUrl: "",
    priority: "NORMAL",
    targetType: "ALL",
    targetId: "",
    startDate: "",
    endDate: "",
    status: "DRAFT",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const updateField = (field: keyof NotificationPayload, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (formData.targetType !== "ALL" && !formData.targetId?.trim()) {
      setMessage("Vui lòng nhập Target ID khi gửi theo khoa, lớp hoặc MSSV.");
      return;
    }

    setLoading(true);

    try {
      const validated = notificationSchema.parse(formData);
      await notificationApi.create({
        ...validated,
        attachmentUrl: validated.attachmentUrl || undefined,
        targetId: validated.targetType === "ALL" ? undefined : validated.targetId,
        startDate: toApiDateTime(validated.startDate),
        endDate: toApiDateTime(validated.endDate),
      });
      setMessage("Đã tạo thông báo trên notification-service.");
    } catch (err) {
      setMessage(getZodMessage(err, err instanceof Error ? err.message : "Khong tao duoc thong bao."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Tạo thông báo mới"
        subtitle="Form này gọi POST /api/notifications, dùng role ADMIN từ JWT do Gateway truyền xuống."
      />
      <Card>
        {message && <div className="mb-5 rounded-lg bg-surface-container-low px-4 py-3 font-semibold text-primary">{message}</div>}
        <form className="grid gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
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
          <FormField label="Tệp đính kèm URL" onChange={(event) => updateField("attachmentUrl", event.target.value)} value={formData.attachmentUrl} />
          <FormField
            as="select"
            label="Trạng thái"
            onChange={(event) => updateField("status", event.target.value)}
            options={["DRAFT", "PUBLISHED"]}
            value={formData.status}
          />
          <FormField
            as="textarea"
            className="md:col-span-2"
            label="Nội dung HTML"
            onChange={(event) => updateField("content", event.target.value)}
            required
            value={formData.content}
          />
          <div className="md:col-span-2">
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              <Send className="h-5 w-5" />
              {loading ? "Đang gửi..." : "Tạo thông báo"}
            </button>
          </div>
        </form>
      </Card>
    </>
  );
}

export default NotificationCreatePage;
