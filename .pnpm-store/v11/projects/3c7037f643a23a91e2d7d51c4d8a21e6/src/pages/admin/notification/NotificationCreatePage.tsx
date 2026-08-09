import { Send } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
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
  type NotificationTargetType,
} from "../../../services/api";
import { toApiLocalDateTime } from "../../../utils/dateTime";
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
  const [faculties, setFaculties] = useState<FacultyResponse[]>([]);
  const [classes, setClasses] = useState<ClassResponse[]>([]);

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
    if (formData.targetType === "FACULTY") {
      return faculties.map((faculty) => ({
        value: faculty.facultyCode,
        label: faculty.facultyCode,
        description: faculty.facultyName,
        searchText: `${faculty.id} ${faculty.facultyCode} ${faculty.facultyName}`,
      }));
    }

    if (formData.targetType === "CLASS") {
      return classes.map((clazz) => ({
        value: clazz.classCode,
        label: clazz.classCode,
        description: [clazz.faculty?.facultyCode, clazz.academicYear?.yearName].filter(Boolean).join(" · "),
        searchText: `${clazz.id} ${clazz.classCode} ${clazz.faculty?.facultyCode ?? ""} ${clazz.faculty?.facultyName ?? ""} ${clazz.academicYear?.yearName ?? ""}`,
      }));
    }

    return [];
  }, [classes, faculties, formData.targetType]);

  const updateField = (field: keyof NotificationPayload, value: string) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
      ...(field === "targetType" ? { targetId: "" } : {}),
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (formData.targetType !== "ALL" && !formData.targetId?.trim()) {
      setMessage("Vui lòng nhập Mã đối tượng khi gửi theo khoa hoặc lớp.");
      return;
    }

    const selectedTarget = formData.targetType === "ALL" ? undefined : findTargetOption(formData.targetId || "", targetOptions);
    if (formData.targetType !== "ALL" && targetOptions.length > 0 && !selectedTarget) {
      setMessage("Vui lòng chọn Mã đối tượng từ danh sách gợi ý để đảm bảo sinh viên nhận đúng thông báo.");
      return;
    }

    setLoading(true);

    try {
      const validated = notificationSchema.parse(formData);
      await notificationApi.create({
        ...validated,
        attachmentUrl: validated.attachmentUrl || undefined,
        targetId: validated.targetType === "ALL" ? undefined : selectedTarget?.value ?? validated.targetId?.trim(),
        startDate: toApiLocalDateTime(validated.startDate),
        endDate: toApiLocalDateTime(validated.endDate),
      });
      setMessage("Đã tạo thông báo.");
    } catch (err) {
      setMessage(getZodMessage(err, err instanceof Error ? err.message : "Không tạo được thông báo."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <BackButton to="/admin/notifications">Quay lại danh sách</BackButton>

      <PageHeader
        title="Tạo thông báo mới"
        subtitle="Soạn nội dung, chọn nhóm nhận và thời gian hiển thị thông báo."
      />
      <Card>
        {message && <div className="mb-5 rounded-lg bg-surface-container-low px-4 py-3 font-semibold text-primary">{message}</div>}
        <form className="grid gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
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
          <FormField label="Tệp đính kèm URL" onChange={(event) => updateField("attachmentUrl", event.target.value)} value={formData.attachmentUrl} />
          <FormField
            as="select"
            label="Trạng thái"
            onChange={(event) => updateField("status", event.target.value)}
            options={statusOptions}
            value={formData.status}
          />
          <RichTextEditor
            className="md:col-span-2"
            hint="Có thể định dạng chữ, chèn link, danh sách và bảng."
            label="Nội dung thông báo"
            onChange={(value) => updateField("content", value)}
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
