import { ArrowLeft, FileUp, PlayCircle, Save, SquareCheckBig, Trash2, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Card from "../../../components/Card";
import FormField from "../../../components/FormField";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import {
  activityApi,
  type ActivityCategory,
  type ActivityCheckerPayload,
  type ActivityCheckerResponse,
  type ActivityPayload,
  type ActivityRegistrationResponse,
  type ActivityResponse,
  type ActivityStatus,
} from "../../../services/api";
import { activityCategoryLabels, formatDateTime, toApiDateTime, toInputDateTime } from "../../../utils/activityUi";
import { activitySchema, checkerSchema } from "../../../validation/activitySchemas";
import { getZodMessage } from "../../../validation/userSchemas";

type ActivityFormState = {
  title: string;
  category: ActivityCategory;
  reward: string;
  googleFormUrl: string;
  location: string;
  startTime: string;
  endTime: string;
  capacity: string;
};

const emptyChecker: ActivityCheckerPayload = {
  checkerTsid: "",
  checkerCode: "",
  checkerName: "",
};

const toForm = (activity: ActivityResponse): ActivityFormState => ({
  title: activity.title,
  category: activity.category,
  reward: activity.reward || "",
  googleFormUrl: activity.googleFormUrl || "",
  location: activity.location || "",
  startTime: toInputDateTime(activity.startTime),
  endTime: toInputDateTime(activity.endTime),
  capacity: activity.capacity ? String(activity.capacity) : "",
});

const toPayload = (form: ActivityFormState): ActivityPayload => ({
  title: form.title.trim(),
  category: form.category,
  reward: form.reward.trim() || undefined,
  googleFormUrl: form.googleFormUrl.trim(),
  location: form.location.trim() || undefined,
  startTime: toApiDateTime(form.startTime),
  endTime: toApiDateTime(form.endTime),
  capacity: form.capacity ? Number(form.capacity) : undefined,
});

const nextStatus = (status: ActivityStatus): ActivityStatus | null => {
  if (status === "UPCOMING") return "ONGOING";
  if (status === "ONGOING") return "COMPLETED";
  return null;
};

function ActivityDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<ActivityResponse | null>(null);
  const [form, setForm] = useState<ActivityFormState | null>(null);
  const [registrations, setRegistrations] = useState<ActivityRegistrationResponse[]>([]);
  const [checkers, setCheckers] = useState<ActivityCheckerResponse[]>([]);
  const [checkerForm, setCheckerForm] = useState<ActivityCheckerPayload>(emptyChecker);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setMessage("");
    try {
      const [activityData, registrationData, checkerData] = await Promise.all([
        activityApi.get(id),
        activityApi.listRegistrations(id),
        activityApi.listCheckers(id),
      ]);
      setActivity(activityData);
      setForm(toForm(activityData));
      setRegistrations(registrationData);
      setCheckers(checkerData);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không tải được chi tiết hoạt động.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadDetail();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadDetail]);

  const updateField = (field: keyof ActivityFormState, value: string) => {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  };

  const updateCheckerField = (field: keyof ActivityCheckerPayload, value: string) => {
    setCheckerForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form || !id) return;

    setSaving(true);
    setMessage("");
    try {
      const payload = toPayload(form);
      const validated = activitySchema.parse(payload);
      const updated = await activityApi.update(id, validated);
      setActivity(updated);
      setForm(toForm(updated));
      setMessage("Đã cập nhật hoạt động.");
    } catch (err) {
      setMessage(getZodMessage(err, err instanceof Error ? err.message : "Không cập nhật được hoạt động."));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async () => {
    if (!activity || !id) return;
    const status = nextStatus(activity.status);
    if (!status) return;

    setMessage("");
    try {
      const updated = await activityApi.updateStatus(id, status);
      setActivity(updated);
      setForm(toForm(updated));
      setMessage("Đã cập nhật trạng thái hoạt động.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không đổi được trạng thái hoạt động.");
    }
  };

  const deleteActivity = async () => {
    if (!activity || !id || !window.confirm(`Xóa hoạt động "${activity.title}"?`)) return;

    setMessage("");
    try {
      await activityApi.remove(id);
      navigate("/admin/activities");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không xóa được hoạt động.");
    }
  };

  const importRegistrations = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !id) return;

    setMessage("");
    try {
      const result = await activityApi.importRegistrations(id, file);
      const registrationData = await activityApi.listRegistrations(id);
      const updated = await activityApi.get(id);
      setRegistrations(registrationData);
      setActivity(updated);
      setForm(toForm(updated));
      setMessage(`Import xong: ${result.successCount}/${result.totalRows} dòng thành công.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không import được danh sách đăng ký.");
    } finally {
      event.target.value = "";
    }
  };

  const addChecker = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id) return;

    setMessage("");
    try {
      const validated = checkerSchema.parse(checkerForm);
      const created = await activityApi.addChecker(id, validated);
      setCheckers((current) => [...current, created]);
      setCheckerForm(emptyChecker);
      setMessage("Đã thêm người điểm danh.");
    } catch (err) {
      setMessage(getZodMessage(err, err instanceof Error ? err.message : "Không thêm được người điểm danh."));
    }
  };

  const removeChecker = async (checker: ActivityCheckerResponse) => {
    if (!id || !window.confirm(`Gỡ người điểm danh ${checker.checkerName}?`)) return;

    setMessage("");
    try {
      await activityApi.removeChecker(id, checker.id);
      setCheckers((current) => current.filter((item) => item.id !== checker.id));
      setMessage("Đã gỡ người điểm danh.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không gỡ được người điểm danh.");
    }
  };

  if (loading) {
    return <div className="panel p-6 text-on-surface-variant">Đang tải chi tiết hoạt động...</div>;
  }

  if (!activity || !form) {
    return (
      <div className="space-y-gutter">
        <PageHeader title="Không tìm thấy hoạt động" subtitle="Hoạt động này không còn tồn tại hoặc bạn không có quyền xem." />
        {message && <div className="rounded-lg bg-error-container px-4 py-3 text-sm font-semibold text-error">{message}</div>}
        <Link className="font-semibold text-primary hover:underline" to="/admin/activities">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  const statusTarget = nextStatus(activity.status);
  const checkedInCount = registrations.filter((registration) => registration.attended).length;

  return (
    <div className="space-y-gutter">
      <PageHeader title={activity.title} subtitle="Quản lý chi tiết hoạt động, danh sách đăng ký, người điểm danh và trạng thái tổ chức." />

      <div className="flex flex-wrap items-center gap-3">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline" to="/admin/activities">
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách
        </Link>
        <StatusBadge status={activity.status} />
      </div>

      {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">{message}</div>}

      <div className="grid gap-gutter xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-primary">Thông tin hoạt động</p>
              <h2 className="text-xl font-bold text-on-surface">{activityCategoryLabels[activity.category]}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {statusTarget && (
                <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-on-primary" onClick={changeStatus} type="button">
                  {statusTarget === "ONGOING" ? <PlayCircle className="h-5 w-5" /> : <SquareCheckBig className="h-5 w-5" />}
                  {statusTarget === "ONGOING" ? "Bắt đầu" : "Hoàn thành"}
                </button>
              )}
              <button className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-semibold text-error hover:bg-error-container" onClick={deleteActivity} type="button">
                <Trash2 className="h-5 w-5" />
                Xóa
              </button>
            </div>
          </div>

          <form className="grid gap-5 md:grid-cols-2" onSubmit={handleSave}>
            <FormField label="Tên hoạt động" onChange={(event) => updateField("title", event.target.value)} required value={form.title} />
            <FormField
              as="select"
              label="Loại hoạt động"
              onChange={(event) => updateField("category", event.target.value)}
              options={["ACADEMIC", "MOVEMENT", "FACULTY", "UNIVERSITY", "OTHER"]}
              value={form.category}
            />
            <FormField label="Điểm rèn luyện" onChange={(event) => updateField("reward", event.target.value)} value={form.reward} />
            <FormField label="Số lượng tối đa" min={1} onChange={(event) => updateField("capacity", event.target.value)} type="number" value={form.capacity} />
            <FormField label="Thời gian bắt đầu" onChange={(event) => updateField("startTime", event.target.value)} required type="datetime-local" value={form.startTime} />
            <FormField label="Thời gian kết thúc" onChange={(event) => updateField("endTime", event.target.value)} required type="datetime-local" value={form.endTime} />
            <FormField label="Địa điểm" onChange={(event) => updateField("location", event.target.value)} value={form.location} />
            <FormField label="Google Form đăng ký" onChange={(event) => updateField("googleFormUrl", event.target.value)} required value={form.googleFormUrl} />
            <div className="md:col-span-2">
              <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary disabled:opacity-60" disabled={saving} type="submit">
                <Save className="h-5 w-5" />
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </Card>

        <div className="grid gap-gutter">
          <Card>
            <p className="text-sm font-semibold text-primary">Thống kê</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-surface-container-low p-4">
                <p className="text-2xl font-bold text-on-surface">{registrations.length}</p>
                <p className="text-xs text-on-surface-variant">Đăng ký</p>
              </div>
              <div className="rounded-lg bg-surface-container-low p-4">
                <p className="text-2xl font-bold text-on-surface">{checkedInCount}</p>
                <p className="text-xs text-on-surface-variant">Đã điểm danh</p>
              </div>
              <div className="rounded-lg bg-surface-container-low p-4">
                <p className="text-2xl font-bold text-on-surface">{checkers.length}</p>
                <p className="text-xs text-on-surface-variant">Người quét</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm text-on-surface-variant">
              <p>Bắt đầu: {formatDateTime(activity.startTime)}</p>
              <p>Kết thúc: {formatDateTime(activity.endTime)}</p>
              <p>Địa điểm: {activity.location || "Chưa cập nhật"}</p>
            </div>
          </Card>

          <Card>
            <p className="text-sm font-semibold text-primary">Import danh sách đăng ký</p>
            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary hover:bg-surface-container">
              <FileUp className="h-5 w-5" />
              Chọn file Excel
              <input accept=".xlsx,.xls" className="sr-only" onChange={importRegistrations} type="file" />
            </label>
            <p className="mt-3 text-xs text-on-surface-variant">Cột 1: MSSV, cột 2: họ tên, cột 3: user TSID nếu có.</p>
          </Card>
        </div>
      </div>

      <Card>
        <div className="mb-5">
          <p className="text-sm font-semibold text-primary">Người điểm danh</p>
          <h2 className="text-xl font-bold text-on-surface">Phân quyền quét mã cho hoạt động</h2>
        </div>
        <form className="grid gap-4 md:grid-cols-[1fr_1fr_1.2fr_auto]" onSubmit={addChecker}>
          <FormField label="Checker TSID" onChange={(event) => updateCheckerField("checkerTsid", event.target.value)} value={checkerForm.checkerTsid} />
          <FormField label="Mã người điểm danh" onChange={(event) => updateCheckerField("checkerCode", event.target.value)} value={checkerForm.checkerCode} />
          <FormField label="Họ tên" onChange={(event) => updateCheckerField("checkerName", event.target.value)} value={checkerForm.checkerName} />
          <button className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary" type="submit">
            <UserPlus className="h-5 w-5" />
            Thêm
          </button>
        </form>

        <div className="mt-5 divide-y divide-outline-variant">
          {checkers.length === 0 ? (
            <p className="py-4 text-sm text-on-surface-variant">Chưa có người điểm danh.</p>
          ) : (
            checkers.map((checker) => (
              <div key={checker.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-semibold text-on-surface">{checker.checkerName}</p>
                  <p className="text-sm text-on-surface-variant">
                    {checker.checkerCode} · TSID {checker.checkerTsid}
                  </p>
                </div>
                <button className="rounded-lg px-3 py-2 text-sm font-semibold text-error hover:bg-error-container" onClick={() => void removeChecker(checker)} type="button">
                  Gỡ
                </button>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-outline-variant px-5 py-4">
          <h2 className="text-lg font-semibold text-on-surface">Danh sách sinh viên đăng ký</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-5 py-4 font-semibold text-on-surface">MSSV</th>
                <th className="px-5 py-4 font-semibold text-on-surface">Họ tên</th>
                <th className="px-5 py-4 font-semibold text-on-surface">User TSID</th>
                <th className="px-5 py-4 font-semibold text-on-surface">Trạng thái</th>
                <th className="px-5 py-4 font-semibold text-on-surface">Thời gian điểm danh</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((registration) => (
                <tr key={registration.id} className="border-t border-outline-variant">
                  <td className="px-5 py-4 font-semibold text-on-surface">{registration.studentCode}</td>
                  <td className="px-5 py-4 text-on-surface-variant">{registration.fullName}</td>
                  <td className="px-5 py-4 text-on-surface-variant">{registration.userTsid}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${registration.attended ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                      {registration.attended ? "Đã điểm danh" : "Chưa điểm danh"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-on-surface-variant">{registration.checkinTime ? formatDateTime(registration.checkinTime) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {registrations.length === 0 && <p className="px-5 py-6 text-sm text-on-surface-variant">Chưa có sinh viên đăng ký.</p>}
        </div>
      </Card>
    </div>
  );
}

export default ActivityDetailPage;
