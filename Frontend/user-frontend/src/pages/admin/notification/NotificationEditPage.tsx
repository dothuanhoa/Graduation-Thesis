import { RotateCcw, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AutocompleteInput, { type AutocompleteOption } from "../../../components/AutocompleteInput";
import BackButton from "../../../components/BackButton";
import Card from "../../../components/Card";
import FormField from "../../../components/FormField";
import PageHeader from "../../../components/PageHeader";
import RichTextEditor from "../../../components/RichTextEditor";
import {
  classApi,
  facultyApi,
  notificationApi,
  type ClassResponse,
  type FacultyResponse,
  type NotificationPayload,
  type NotificationResponse,
  type NotificationTargetType,
} from "../../../services/api";
import { toApiLocalDateTime, toDateTimeLocalInput } from "../../../utils/dateTime";
import { notificationSchema } from "../../../validation/notificationSchemas";
import { getZodMessage } from "../../../validation/userSchemas";

const targetTypeLabels: Record<NotificationTargetType, string> = {
  ALL: "Toàn trường",
  FACULTY: "Theo khoa",
  CLASS: "Theo lớp",
};

const targetTypeOptions: NotificationTargetType[] = ["ALL", "FACULTY", "CLASS"];
const priorityOptions = [
  { value: "NORMAL", label: "Bình thường" },
  { value: "URGENT", label: "Cấp bách" },
];
const statusOptions = [
  { value: "DRAFT", label: "Bản nháp" },
  { value: "PUBLISHED", label: "Đã xuất bản" },
  { value: "EXPIRED", label: "Hết hạn" },
  { value: "REVOKED", label: "Đã thu hồi" },
];

const findTargetOption = (value: string, options: AutocompleteOption[]) => {
  const cleanValue = value.trim().toLowerCase();
  if (!cleanValue) return undefined;
  return options.find((option) => {
    const searchTokens = (option.searchText || "")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    return option.value.toLowerCase() === cleanValue || option.label.toLowerCase() === cleanValue || searchTokens.includes(cleanValue);
  });
};

const toPayload = (item: NotificationResponse): NotificationPayload => ({
  title: item.title,
  content: item.content,
  attachmentUrl: item.attachmentUrl || "",
  priority: item.priority,
  targetType: item.targetType,
  targetId: item.targetId || "",
  startDate: toDateTimeLocalInput(item.startDate),
  endDate: toDateTimeLocalInput(item.endDate),
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
  const [faculties, setFaculties] = useState<FacultyResponse[]>([]);
  const [classes, setClasses] = useState<ClassResponse[]>([]);

  const loadNotification = useCallback(async () => {
    if (!id) {
      navigate("/404", { replace: true });
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const notifications = await notificationApi.listAdmin();
      const current = notifications.find((item) => String(item.id) === String(id));
      if (!current) {
        navigate("/404", { replace: true });
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
  }, [id, navigate]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadNotification();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadNotification]);

  useEffect(() => {
    const timerId = window.setTimeout(async () => {
      try {
        const [facultyData, classData] = await Promise.all([facultyApi.list(), classApi.list()]);
        setFaculties(facultyData);
        setClasses(classData);
      } catch {
        setFaculties([]);
        setClasses([]);
      }
    }, 0);

    return () => window.clearTimeout(timerId);
  }, []);

  const targetOptions = useMemo<AutocompleteOption[]>(() => {
    if (formData?.targetType === "FACULTY") {
      return faculties.map((faculty) => ({
        value: faculty.facultyCode,
        label: faculty.facultyCode,
        description: faculty.facultyName,
        searchText: `${faculty.id} ${faculty.facultyCode} ${faculty.facultyName}`,
      }));
    }

    if (formData?.targetType === "CLASS") {
      return classes.map((clazz) => ({
        value: clazz.classCode,
        label: clazz.classCode,
        description: [clazz.faculty?.facultyCode, clazz.academicYear?.yearName].filter(Boolean).join(" · "),
        searchText: `${clazz.id} ${clazz.classCode} ${clazz.faculty?.facultyCode ?? ""} ${clazz.faculty?.facultyName ?? ""} ${clazz.academicYear?.yearName ?? ""}`,
      }));
    }

    return [];
  }, [classes, faculties, formData?.targetType]);

  const updateField = (field: keyof NotificationPayload, value: string) => {
    setFormData((current) =>
      current
        ? {
            ...current,
            [field]: value,
            ...(field === "targetType" ? { targetId: "" } : {}),
          }
        : current,
    );
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || !formData) return;

    if (formData.targetType !== "ALL" && !formData.targetId?.trim()) {
      setMessage("Vui lòng nhập Mã đối tượng khi gửi theo khoa hoặc lớp.");
      return;
    }

    const selectedTarget = formData.targetType === "ALL" ? undefined : findTargetOption(formData.targetId || "", targetOptions);
    if (formData.targetType !== "ALL" && targetOptions.length > 0 && !selectedTarget) {
      setMessage("Vui lòng chọn Mã đối tượng từ danh sách gợi ý để đảm bảo sinh viên nhận đúng thông báo.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const validated = notificationSchema.parse(formData);
      const updated = await notificationApi.update(id, {
        ...validated,
        attachmentUrl: validated.attachmentUrl || undefined,
        targetId: validated.targetType === "ALL" ? undefined : selectedTarget?.value ?? validated.targetId?.trim(),
        startDate: toApiLocalDateTime(validated.startDate),
        endDate: toApiLocalDateTime(validated.endDate),
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
              options={priorityOptions}
              value={formData.priority}
            />
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-on-surface">Đối tượng nhận</span>
              <select
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface focus-ring"
                onChange={(event) => updateField("targetType", event.target.value)}
                value={formData.targetType}
              >
                {targetTypeOptions.map((targetType) => (
                  <option key={targetType} value={targetType}>
                    {targetTypeLabels[targetType]}
                  </option>
                ))}
              </select>
            </label>
            <AutocompleteInput
              disabled={formData.targetType === "ALL"}
              emptyMessage="Không tìm thấy mã phù hợp."
              hint={formData.targetType === "ALL" ? "Gửi toàn trường nên không cần mã đối tượng." : "Chọn theo mã của trường, ví dụ CNTT hoặc D22_TH01."}
              label="Mã đối tượng"
              onChange={(value) => updateField("targetId", value)}
              onSelect={(option) => updateField("targetId", option.value)}
              options={targetOptions}
              placeholder={formData.targetType === "FACULTY" ? "VD: CNTT" : formData.targetType === "CLASS" ? "VD: D22_TH01" : "Không áp dụng"}
              value={formData.targetType === "ALL" ? "" : formData.targetId || ""}
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
            <FormField as="select" label="Trạng thái" onChange={(event) => updateField("status", event.target.value)} options={statusOptions} value={formData.status} />
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
