import { ArrowLeft, Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../../../components/Card";
import FormField from "../../../components/FormField";
import PageHeader from "../../../components/PageHeader";
import { activityApi, type ActivityCategory, type ActivityParticipationType, type ActivityPayload } from "../../../services/api";
import { toApiDateTime } from "../../../utils/activityUi";
import { activitySchema } from "../../../validation/activitySchemas";
import { getZodMessage } from "../../../validation/userSchemas";

type ActivityFormState = {
  title: string;
  category: ActivityCategory;
  participationType: ActivityParticipationType;
  reward: string;
  googleFormUrl: string;
  location: string;
  startTime: string;
  endTime: string;
  capacity: string;
};

const initialForm: ActivityFormState = {
  title: "",
  category: "UNIVERSITY",
  participationType: "LIMITED",
  reward: "",
  googleFormUrl: "",
  location: "",
  startTime: "",
  endTime: "",
  capacity: "",
};

const toPayload = (form: ActivityFormState): ActivityPayload => ({
  title: form.title.trim(),
  category: form.category,
  participationType: form.participationType,
  reward: form.reward.trim(),
  googleFormUrl: form.participationType === "LIMITED" ? form.googleFormUrl.trim() : undefined,
  location: form.location.trim(),
  startTime: toApiDateTime(form.startTime),
  endTime: toApiDateTime(form.endTime),
  capacity: form.participationType === "LIMITED" ? Number(form.capacity) : undefined,
});

function ActivityCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const updateField = (field: keyof ActivityFormState, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "participationType" && value === "OPEN" ? { capacity: "", googleFormUrl: "" } : {}),
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const payload = toPayload(form);
      const validated = activitySchema.parse(payload);
      const created = await activityApi.create(validated);
      navigate(`/admin/activities/${created.id}`);
    } catch (err) {
      setMessage(getZodMessage(err, err instanceof Error ? err.message : "Không tạo được hoạt động."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-gutter">
      <PageHeader
        title="Tạo hoạt động"
        subtitle="Khai báo hoạt động ngoại khóa, thời gian, địa điểm, điểm rèn luyện và link đăng ký Google Form."
      />

      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline" to="/admin/activities">
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách
      </Link>

      {message && <div className="rounded-lg bg-error-container px-4 py-3 text-sm font-semibold text-error">{message}</div>}

      <Card>
        <form className="grid gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
          <FormField label="Tên hoạt động" onChange={(event) => updateField("title", event.target.value)} required value={form.title} />
          <FormField
            as="select"
            label="Loại hoạt động"
            onChange={(event) => updateField("category", event.target.value)}
            options={["ACADEMIC", "MOVEMENT", "FACULTY", "UNIVERSITY", "OTHER"]}
            value={form.category}
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">Hình thức tham gia</span>
            <select
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface focus-ring"
              onChange={(event) => updateField("participationType", event.target.value)}
              value={form.participationType}
            >
              <option value="LIMITED">Giới hạn đăng ký</option>
              <option value="OPEN">Tự do tham gia</option>
            </select>
          </label>
          <FormField label="Điểm rèn luyện" onChange={(event) => updateField("reward", event.target.value)} placeholder="Ví dụ: +5 điểm" required value={form.reward} />
          {form.participationType === "LIMITED" && (
            <FormField label="Số lượng tối đa" min={1} onChange={(event) => updateField("capacity", event.target.value)} required type="number" value={form.capacity} />
          )}
          <FormField label="Thời gian bắt đầu" onChange={(event) => updateField("startTime", event.target.value)} required type="datetime-local" value={form.startTime} />
          <FormField label="Thời gian kết thúc" onChange={(event) => updateField("endTime", event.target.value)} required type="datetime-local" value={form.endTime} />
          <FormField label="Địa điểm" onChange={(event) => updateField("location", event.target.value)} required value={form.location} />
          {form.participationType === "LIMITED" ? (
            <FormField label="Google Form đăng ký" onChange={(event) => updateField("googleFormUrl", event.target.value)} placeholder="https://forms.gle/..." required value={form.googleFormUrl} />
          ) : (
            <div className="rounded-lg bg-surface-container-low p-4 text-sm text-on-surface-variant">
              Hoạt động tự do không cần Google Form và không giới hạn số lượng. Khi điểm danh, hệ thống chỉ kiểm tra MSSV có tồn tại trong hồ sơ sinh viên.
            </div>
          )}

          <div className="md:col-span-2">
            <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-on-primary disabled:opacity-60" disabled={saving} type="submit">
              <Save className="h-5 w-5" />
              {saving ? "Đang lưu..." : "Lưu hoạt động"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default ActivityCreatePage;
