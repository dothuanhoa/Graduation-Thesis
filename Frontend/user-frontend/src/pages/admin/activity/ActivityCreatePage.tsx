import { Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../../../components/BackButton";
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
  location: string;
  registrationStartTime: string;
  registrationEndTime: string;
  startTime: string;
  endTime: string;
  capacity: string;
  attendanceSessionCount: string;
};

const initialForm: ActivityFormState = {
  title: "",
  category: "UNIVERSITY",
  participationType: "LIMITED",
  reward: "",
  location: "",
  registrationStartTime: "",
  registrationEndTime: "",
  startTime: "",
  endTime: "",
  capacity: "",
  attendanceSessionCount: "2",
};

const toPayload = (form: ActivityFormState): ActivityPayload => ({
  title: form.title.trim(),
  category: form.category,
  participationType: form.participationType,
  reward: form.reward.trim(),
  googleFormUrl: "",
  registrationStartTime: form.participationType === "LIMITED" ? toApiDateTime(form.registrationStartTime) : undefined,
  registrationEndTime: form.participationType === "LIMITED" ? toApiDateTime(form.registrationEndTime) : undefined,
  location: form.location.trim(),
  startTime: toApiDateTime(form.startTime),
  endTime: toApiDateTime(form.endTime),
  capacity: form.participationType === "LIMITED" ? Number(form.capacity) : undefined,
  attendanceSessionCount: form.participationType === "LIMITED" ? Number(form.attendanceSessionCount || 2) : 1,
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
      ...(field === "participationType" && value === "OPEN"
        ? { capacity: "", registrationStartTime: "", registrationEndTime: "", attendanceSessionCount: "1" }
        : {}),
      ...(field === "participationType" && value === "LIMITED" ? { attendanceSessionCount: current.attendanceSessionCount === "1" ? "2" : current.attendanceSessionCount } : {}),
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
        subtitle="Khai báo hoạt động, thời gian tổ chức và cấu hình cách điểm danh cho sinh viên."
      />

      <BackButton to="/admin/activities">Quay lại danh sách</BackButton>

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
            <>
              <FormField label="Thời gian mở đăng ký" onChange={(event) => updateField("registrationStartTime", event.target.value)} required type="datetime-local" value={form.registrationStartTime} />
              <FormField label="Thời gian đóng đăng ký" onChange={(event) => updateField("registrationEndTime", event.target.value)} required type="datetime-local" value={form.registrationEndTime} />
              <FormField label="Số lượng tối đa" min={1} onChange={(event) => updateField("capacity", event.target.value)} required type="number" value={form.capacity} />
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-on-surface">Số lần điểm danh</span>
                <select
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface focus-ring"
                  onChange={(event) => updateField("attendanceSessionCount", event.target.value)}
                  value={form.attendanceSessionCount}
                >
                  <option value="2">2 lần: khuôn mặt đầu giờ + QR cuối giờ</option>
                  <option value="3">3 lần: khuôn mặt đầu giờ + QR giữa giờ + QR cuối giờ</option>
                </select>
              </label>
            </>
          )}

          <FormField label="Thời gian bắt đầu hoạt động" onChange={(event) => updateField("startTime", event.target.value)} required type="datetime-local" value={form.startTime} />
          <FormField label="Thời gian kết thúc hoạt động" onChange={(event) => updateField("endTime", event.target.value)} required type="datetime-local" value={form.endTime} />
          <FormField label="Địa điểm" onChange={(event) => updateField("location", event.target.value)} required value={form.location} />

          {form.participationType === "OPEN" && (
            <div className="rounded-lg bg-surface-container-low p-4 text-sm text-on-surface-variant">
              Hoạt động tự do không cần đăng ký trước và chỉ điểm danh một lần bằng xác thực khuôn mặt.
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
