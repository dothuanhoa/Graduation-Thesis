import { Download, FileUp, PlayCircle, Save, SquareCheckBig, Trash2, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BackButton from "../../../components/BackButton";
import Card from "../../../components/Card";
import FormField from "../../../components/FormField";
import PageHeader from "../../../components/PageHeader";
import PaginationControls from "../../../components/PaginationControls";
import StatusBadge from "../../../components/StatusBadge";
import { usePaginatedList } from "../../../hooks/usePaginatedList";
import {
  ApiError,
  activityApi,
  userApi,
  type ActivityCategory,
  type ActivityCheckerPayload,
  type ActivityCheckerResponse,
  type ActivityPayload,
  type ActivityParticipationType,
  type ActivityRegistrationPayload,
  type ActivityRegistrationResponse,
  type ActivityResponse,
  type ActivityStatus,
  type UserProfile,
} from "../../../services/api";
import { activityCategoryLabels, activityParticipationLabels, formatDateTime, toApiDateTime, toInputDateTime } from "../../../utils/activityUi";
import { exportXlsxFile, safeFileName } from "../../../utils/xlsxExport";
import { toUserFacingMessage } from "../../../utils/messages";
import { emitToast } from "../../../utils/toastBus";
import { activitySchema, checkerSchema, registrationSchema } from "../../../validation/activitySchemas";
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

const emptyChecker: ActivityCheckerPayload = {
  checkerCode: "",
  checkerName: "",
};

const emptyRegistration: ActivityRegistrationPayload = {
  studentCode: "",
  fullName: "",
};

const IMPORT_TEMPLATE_FILENAME = "mau-import-danh-sach-tham-gia.xlsx";

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

const toForm = (activity: ActivityResponse): ActivityFormState => ({
  title: activity.title,
  category: activity.category,
  participationType: activity.participationType || "LIMITED",
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
  participationType: form.participationType,
  reward: form.reward.trim(),
  googleFormUrl: form.participationType === "LIMITED" ? form.googleFormUrl.trim() : undefined,
  location: form.location.trim(),
  startTime: toApiDateTime(form.startTime),
  endTime: toApiDateTime(form.endTime),
  capacity: form.participationType === "LIMITED" ? Number(form.capacity) : undefined,
});

const nextStatus = (status: ActivityStatus): ActivityStatus | null => {
  if (status === "UPCOMING") return "ONGOING";
  if (status === "ONGOING") return "COMPLETED";
  return null;
};

const normalizeLookupText = (value = "") =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const throwProfileValidation = (message: string): never => {
  const userMessage = toUserFacingMessage(message);
  emitToast({ variant: "warning", message: userMessage });
  throw new Error(userMessage);
};

const requireMatchingProfile = (profile: UserProfile | null, code: string, fullName: string, subjectLabel: string): UserProfile => {
  const cleanCode = code.trim();
  const cleanName = fullName.trim();

  if (!profile) {
    throwProfileValidation(`Không tìm thấy ${subjectLabel} có mã ${cleanCode}.`);
  }

  const matchedProfile = profile as UserProfile;

  if (normalizeLookupText(matchedProfile.studentId) !== normalizeLookupText(cleanCode)) {
    throwProfileValidation(`Mã ${subjectLabel} không khớp với hồ sơ.`);
  }

  if (normalizeLookupText(matchedProfile.fullName) !== normalizeLookupText(cleanName)) {
    throwProfileValidation(`Họ tên không khớp với MSSV ${cleanCode}. Họ tên trong hồ sơ: ${matchedProfile.fullName}.`);
  }

  return matchedProfile;
};

const getStudentSuggestions = (profiles: UserProfile[], query: string) => {
  const normalizedQuery = normalizeLookupText(query);
  if (!normalizedQuery) return [];

  return profiles
    .filter((profile) => {
      const code = normalizeLookupText(profile.studentId);
      const name = normalizeLookupText(profile.fullName);
      return code.includes(normalizedQuery) || name.includes(normalizedQuery);
    })
    .slice(0, 6);
};

type StudentAutocompleteFieldProps = {
  label: string;
  value: string;
  profiles: UserProfile[];
  placeholder?: string;
  onChange: (value: string) => void;
  onSelect: (profile: UserProfile) => void;
};

function StudentAutocompleteField({ label, value, profiles, placeholder, onChange, onSelect }: StudentAutocompleteFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const suggestions = getStudentSuggestions(profiles, value);
  const shouldShowSuggestions = isOpen && value.trim().length > 0;

  return (
    <label className="relative flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-on-surface">{label}</span>
      <input
        autoComplete="off"
        className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface placeholder:text-outline focus-ring"
        onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        value={value}
      />
      {shouldShowSuggestions && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-outline-variant bg-surface-container-lowest p-1 shadow-raised">
          {suggestions.length === 0 ? (
            <p className="px-3 py-2 text-sm text-on-surface-variant">Không tìm thấy sinh viên phù hợp.</p>
          ) : (
            suggestions.map((profile) => (
              <button
                key={profile.id}
                className="flex w-full flex-col rounded-lg px-3 py-2 text-left transition hover:bg-surface-container-low"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelect(profile);
                  setIsOpen(false);
                }}
                type="button"
              >
                <span className="font-semibold text-on-surface">{profile.fullName}</span>
                <span className="text-sm font-semibold text-primary">{profile.studentId}</span>
              </button>
            ))
          )}
        </div>
      )}
    </label>
  );
}

function ActivityDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<ActivityResponse | null>(null);
  const [form, setForm] = useState<ActivityFormState | null>(null);
  const [registrations, setRegistrations] = useState<ActivityRegistrationResponse[]>([]);
  const [checkers, setCheckers] = useState<ActivityCheckerResponse[]>([]);
  const [studentProfiles, setStudentProfiles] = useState<UserProfile[]>([]);
  const [checkerForm, setCheckerForm] = useState<ActivityCheckerPayload>(emptyChecker);
  const [registrationForm, setRegistrationForm] = useState<ActivityRegistrationPayload>(emptyRegistration);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [message, setMessage] = useState("");

  const loadDetail = useCallback(async () => {
    if (!id) {
      navigate("/404", { replace: true });
      return;
    }
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
      if (err instanceof ApiError && err.status === 404) {
        navigate("/404", { replace: true });
        return;
      }
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

  useEffect(() => {
    let isMounted = true;
    const timerId = window.setTimeout(async () => {
      try {
        const profiles = await userApi.list();
        if (isMounted) {
          setStudentProfiles(profiles.filter((profile) => profile.studentId && profile.fullName));
        }
      } catch {
        if (isMounted) {
          setStudentProfiles([]);
        }
      }
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timerId);
    };
  }, []);

  const updateField = (field: keyof ActivityFormState, value: string) => {
    setForm((current) =>
      current
        ? {
            ...current,
            [field]: value,
            ...(field === "participationType" && value === "OPEN" ? { capacity: "", googleFormUrl: "" } : {}),
          }
        : current,
    );
  };

  const updateCheckerField = (field: keyof ActivityCheckerPayload, value: string) => {
    setCheckerForm((current) => ({ ...current, [field]: value }));
  };

  const updateRegistrationField = (field: keyof ActivityRegistrationPayload, value: string) => {
    setRegistrationForm((current) => ({ ...current, [field]: value }));
  };

  const selectCheckerProfile = (profile: UserProfile) => {
    setCheckerForm({
      checkerCode: profile.studentId,
      checkerName: profile.fullName,
    });
  };

  const selectRegistrationProfile = (profile: UserProfile) => {
    setRegistrationForm({
      studentCode: profile.studentId,
      fullName: profile.fullName,
    });
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
      const errorDetails = (result.errors || []).slice(0, 5).join(" | ");
      const moreErrors = result.errors && result.errors.length > 5 ? ` Còn ${result.errors.length - 5} lỗi khác.` : "";
      const importMessage = result.skipped > 0
        ? `Import xong: ${result.imported} dòng thành công, ${result.skipped} dòng chưa nhập được.${errorDetails ? ` Chi tiết: ${errorDetails}.${moreErrors}` : ""}`
        : `Import thành công ${result.imported} dòng.`;
      setMessage(importMessage);
      emitToast({ variant: result.skipped > 0 ? "error" : "success", message: importMessage });
    } catch (err) {
      const failMessage = err instanceof Error ? err.message : "Không import được danh sách đăng ký.";
      setMessage(failMessage);
      emitToast({ variant: "error", message: failMessage });
    } finally {
      event.target.value = "";
    }
  };

  const downloadRegistrationTemplate = async () => {
    setDownloadingTemplate(true);
    setMessage("");
    try {
      const blob = await activityApi.downloadRegistrationImportTemplate();
      downloadBlob(blob, IMPORT_TEMPLATE_FILENAME);
      setMessage("Đã tải file mẫu import danh sách tham gia.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không tải được file mẫu import.");
    } finally {
      setDownloadingTemplate(false);
    }
  };


  const exportActivityDetail = () => {
    if (!activity) return;

    const participationType = activity.participationType || "LIMITED";
    const attended = registrations.filter((registration) => registration.attended).length;
    const notAttended = participationType === "OPEN" ? "Kh\u00f4ng \u00e1p d\u1ee5ng" : Math.max(registrations.length - attended, 0);

    exportXlsxFile(`tong-ket-hoat-dong-${safeFileName(activity.title || "hoat-dong")}.xlsx`, [
      {
        name: "Tong ket",
        rows: [
          ["Ho\u1ea1t \u0111\u1ed9ng", activity.title],
          ["Lo\u1ea1i", activityCategoryLabels[activity.category]],
          ["H\u00ecnh th\u1ee9c", activityParticipationLabels[participationType]],
          ["Th\u1eddi gian b\u1eaft \u0111\u1ea7u", formatDateTime(activity.startTime)],
          ["Th\u1eddi gian k\u1ebft th\u00fac", formatDateTime(activity.endTime)],
          ["\u0110\u1ecba \u0111i\u1ec3m", activity.location || ""],
          ["S\u1ed1 sinh vi\u00ean trong danh s\u00e1ch", participationType === "OPEN" ? "Kh\u00f4ng \u00e1p d\u1ee5ng" : registrations.length],
          ["S\u1ed1 sinh vi\u00ean \u0111\u00e3 \u0111i\u1ec3m danh", attended],
          ["S\u1ed1 sinh vi\u00ean ch\u01b0a \u0111i\u1ec3m danh", notAttended],
        ],
      },
      {
        name: "Danh sach",
        rows: [
          ["MSSV", "H\u1ecd t\u00ean", "Tr\u1ea1ng th\u00e1i", "Th\u1eddi gian \u0111i\u1ec3m danh"],
          ...registrations.map((registration) => [
            registration.studentCode,
            registration.fullName,
            registration.attended ? "\u0110\u00e3 \u0111i\u1ec3m danh" : "Ch\u01b0a \u0111i\u1ec3m danh",
            registration.checkinTime ? formatDateTime(registration.checkinTime) : "",
          ]),
        ],
      },
    ]);
    setMessage("\u0110\u00e3 xu\u1ea5t file Excel t\u1ed5ng k\u1ebft ho\u1ea1t \u0111\u1ed9ng.");
  };
  const addRegistration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id) return;

    setMessage("");
    try {
      const validated = registrationSchema.parse(registrationForm);
      const profile = await userApi.getByStudentId(validated.studentCode.trim());
      const matchedProfile = requireMatchingProfile(profile, validated.studentCode, validated.fullName, "sinh viên");
      const payload: ActivityRegistrationPayload = {
        studentCode: matchedProfile.studentId,
        fullName: matchedProfile.fullName,
      };
      const created = await activityApi.addRegistration(id, payload);
      const updated = await activityApi.get(id);
      setRegistrations((current) => [...current, created].sort((a, b) => a.studentCode.localeCompare(b.studentCode)));
      setActivity(updated);
      setForm(toForm(updated));
      setRegistrationForm(emptyRegistration);
      setMessage("Đã thêm sinh viên vào danh sách đăng ký.");
    } catch (err) {
      setMessage(getZodMessage(err, err instanceof Error ? err.message : "Không thêm được sinh viên đăng ký."));
    }
  };

  const addChecker = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id) return;

    setMessage("");
    try {
      const validated = checkerSchema.parse(checkerForm);
      const profile = await userApi.getByStudentId(validated.checkerCode.trim());
      const matchedProfile = requireMatchingProfile(profile, validated.checkerCode, validated.checkerName, "người điểm danh");
      const created = await activityApi.addChecker(id, {
        checkerCode: matchedProfile.studentId,
        checkerName: matchedProfile.fullName,
      });
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

  const removeRegistration = async (registration: ActivityRegistrationResponse) => {
    if (!id || !window.confirm(`Gỡ sinh viên ${registration.fullName || registration.studentCode} khỏi danh sách đăng ký?`)) return;

    setMessage("");
    try {
      await activityApi.removeRegistration(id, registration.id);
      const updated = await activityApi.get(id);
      setRegistrations((current) => current.filter((item) => item.id !== registration.id));
      setActivity(updated);
      setForm(toForm(updated));
      setMessage("Đã gỡ sinh viên khỏi danh sách đăng ký.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không gỡ được sinh viên khỏi danh sách đăng ký.");
    }
  };

  const {
    pageItems: paginatedCheckers,
    pageIndex: checkerPageIndex,
    pageSize: checkerPageSize,
    totalItems: checkerTotalItems,
    setPageIndex: setCheckerPageIndex,
    setPageSize: setCheckerPageSize,
  } = usePaginatedList(checkers);

  const {
    pageItems: paginatedRegistrations,
    pageIndex: registrationPageIndex,
    pageSize: registrationPageSize,
    totalItems: registrationTotalItems,
    setPageIndex: setRegistrationPageIndex,
    setPageSize: setRegistrationPageSize,
  } = usePaginatedList(registrations);

  if (loading) {
    return <div className="panel p-6 text-on-surface-variant">Đang tải chi tiết hoạt động...</div>;
  }

  if (!activity || !form) {
    return (
      <div className="space-y-gutter">
        <PageHeader title="Không tìm thấy hoạt động" subtitle="Hoạt động này không còn tồn tại hoặc bạn không có quyền xem." />
        {message && <div className="rounded-lg bg-error-container px-4 py-3 text-sm font-semibold text-error">{message}</div>}
        <BackButton to="/admin/activities">Quay lại danh sách</BackButton>
      </div>
    );
  }

  const statusTarget = nextStatus(activity.status);
  const checkedInCount = registrations.filter((registration) => registration.attended).length;
  const isLimitedActivity = (activity.participationType || "LIMITED") === "LIMITED";

  return (
    <div className="space-y-gutter">
      <PageHeader title={activity.title} subtitle="Quản lý chi tiết hoạt động, danh sách đăng ký, người điểm danh và trạng thái tổ chức." />

      <div className="flex flex-wrap items-center gap-3">
        <BackButton to="/admin/activities">Quay lại danh sách</BackButton>
        <StatusBadge status={activity.status} />
        <button className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary hover:bg-surface-container" onClick={exportActivityDetail} type="button">
          <Download className="h-5 w-5" />
          {"Xu\u1ea5t Excel"}
        </button>
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
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-on-surface">Hình thức tham gia</span>
              <select
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface focus-ring"
                disabled={activity.status !== "UPCOMING"}
                onChange={(event) => updateField("participationType", event.target.value)}
                value={form.participationType}
              >
                <option value="LIMITED">Giới hạn đăng ký</option>
                <option value="OPEN">Tự do tham gia</option>
              </select>
            </label>
            <FormField label="Điểm rèn luyện" onChange={(event) => updateField("reward", event.target.value)} required value={form.reward} />
            {form.participationType === "LIMITED" && (
              <FormField label="Số lượng tối đa" min={1} onChange={(event) => updateField("capacity", event.target.value)} required type="number" value={form.capacity} />
            )}
            <FormField label="Thời gian bắt đầu" onChange={(event) => updateField("startTime", event.target.value)} required type="datetime-local" value={form.startTime} />
            <FormField label="Thời gian kết thúc" onChange={(event) => updateField("endTime", event.target.value)} required type="datetime-local" value={form.endTime} />
            <FormField label="Địa điểm" onChange={(event) => updateField("location", event.target.value)} required value={form.location} />
            {form.participationType === "LIMITED" ? (
              <FormField label="Google Form đăng ký" onChange={(event) => updateField("googleFormUrl", event.target.value)} required value={form.googleFormUrl} />
            ) : (
              <div className="rounded-lg bg-surface-container-low p-4 text-sm text-on-surface-variant">
                Hoạt động tự do không cần Google Form và không giới hạn số lượng. Khi điểm danh, sinh viên chỉ cần có hồ sơ hợp lệ trong hệ thống.
              </div>
            )}
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
                <p className="text-xs text-on-surface-variant">{isLimitedActivity ? "Đăng ký" : "Đã ghi nhận"}</p>
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
              <p>Hình thức: {activityParticipationLabels[activity.participationType || "LIMITED"]}</p>
              <p>Bắt đầu: {formatDateTime(activity.startTime)}</p>
              <p>Kết thúc: {formatDateTime(activity.endTime)}</p>
              <p>Địa điểm: {activity.location || "Chưa cập nhật"}</p>
            </div>
          </Card>

          {isLimitedActivity && (
            <Card>
              <p className="text-sm font-semibold text-primary">Import danh sách đăng ký</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary hover:bg-surface-container">
                  <FileUp className="h-5 w-5" />
                  Chọn file Excel
                  <input accept=".xlsx,.xls" className="sr-only" onChange={importRegistrations} type="file" />
                </label>
                <button
                  className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary hover:bg-surface-container disabled:opacity-60"
                  disabled={downloadingTemplate}
                  onClick={downloadRegistrationTemplate}
                  type="button"
                >
                  <Download className="h-5 w-5" />
                  {downloadingTemplate ? "Đang tải..." : "Tải file mẫu"}
                </button>
              </div>
              <p className="mt-3 text-xs text-on-surface-variant">Cột 1: MSSV, cột 2: họ tên.</p>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <div className="mb-5">
          <p className="text-sm font-semibold text-primary">Người điểm danh</p>
          <h2 className="text-xl font-bold text-on-surface">Phân quyền quét mã cho hoạt động</h2>
        </div>
        <form className="grid gap-4 md:grid-cols-[1fr_1.2fr_auto]" onSubmit={addChecker}>
          <StudentAutocompleteField
            label="Mã người điểm danh"
            onChange={(value) => updateCheckerField("checkerCode", value)}
            onSelect={selectCheckerProfile}
            placeholder="Nhập MSSV hoặc chọn gợi ý"
            profiles={studentProfiles}
            value={checkerForm.checkerCode}
          />
          <StudentAutocompleteField
            label="Họ tên"
            onChange={(value) => updateCheckerField("checkerName", value)}
            onSelect={selectCheckerProfile}
            placeholder="Nhập họ tên để tìm nhanh"
            profiles={studentProfiles}
            value={checkerForm.checkerName}
          />
          <button className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary" type="submit">
            <UserPlus className="h-5 w-5" />
            Thêm
          </button>
        </form>

        <div className="mt-5 divide-y divide-outline-variant">
          {checkers.length === 0 ? (
            <p className="py-4 text-sm text-on-surface-variant">Chưa có người điểm danh.</p>
          ) : (
            paginatedCheckers.map((checker) => (
              <div key={checker.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-semibold text-on-surface">{checker.checkerName}</p>
                  <p className="text-sm text-on-surface-variant">{checker.checkerCode}</p>
                </div>
                <button className="rounded-lg px-3 py-2 text-sm font-semibold text-error hover:bg-error-container" onClick={() => void removeChecker(checker)} type="button">
                  Gỡ
                </button>
              </div>
            ))
          )}
        </div>
        {checkers.length > 0 && (
          <PaginationControls
            itemLabel="người điểm danh"
            onPageChange={setCheckerPageIndex}
            onPageSizeChange={setCheckerPageSize}
            pageIndex={checkerPageIndex}
            pageSize={checkerPageSize}
            totalItems={checkerTotalItems}
          />
        )}
      </Card>

      <Card className="p-0">
        <div className="border-b border-outline-variant px-5 py-4">
          <h2 className="text-lg font-semibold text-on-surface">{isLimitedActivity ? "Danh sách sinh viên đăng ký" : "Danh sách sinh viên đã điểm danh"}</h2>
          {isLimitedActivity && (
            <form className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.4fr_auto]" onSubmit={addRegistration}>
              <StudentAutocompleteField
                label="MSSV"
                onChange={(value) => updateRegistrationField("studentCode", value)}
                onSelect={selectRegistrationProfile}
                placeholder="Nhập MSSV hoặc chọn gợi ý"
                profiles={studentProfiles}
                value={registrationForm.studentCode}
              />
              <StudentAutocompleteField
                label="Họ tên"
                onChange={(value) => updateRegistrationField("fullName", value)}
                onSelect={selectRegistrationProfile}
                placeholder="Nhập họ tên để tìm nhanh"
                profiles={studentProfiles}
                value={registrationForm.fullName}
              />
              <button className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary" type="submit">
                <UserPlus className="h-5 w-5" />
                Thêm sinh viên
              </button>
            </form>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-5 py-4 font-semibold text-on-surface">MSSV</th>
                <th className="px-5 py-4 font-semibold text-on-surface">Họ tên</th>
                <th className="px-5 py-4 font-semibold text-on-surface">Trạng thái</th>
                <th className="px-5 py-4 font-semibold text-on-surface">Thời gian điểm danh</th>
                {isLimitedActivity && <th className="px-5 py-4 text-right font-semibold text-on-surface">Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedRegistrations.map((registration) => (
                <tr key={registration.id} className="border-t border-outline-variant">
                  <td className="px-5 py-4 font-semibold text-on-surface">{registration.studentCode}</td>
                  <td className="px-5 py-4 text-on-surface-variant">{registration.fullName}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${registration.attended ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                      {registration.attended ? "Đã điểm danh" : "Chưa điểm danh"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-on-surface-variant">{registration.checkinTime ? formatDateTime(registration.checkinTime) : "-"}</td>
                  {isLimitedActivity && (
                    <td className="px-5 py-4 text-right">
                      <button
                        className="rounded-lg px-3 py-2 text-sm font-semibold text-error hover:bg-error-container disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={registration.attended}
                        onClick={() => void removeRegistration(registration)}
                        type="button"
                      >
                        Gỡ
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {registrations.length === 0 && (
            <p className="px-5 py-6 text-sm text-on-surface-variant">
              {isLimitedActivity ? "Chưa có sinh viên đăng ký." : "Chưa có sinh viên nào điểm danh."}
            </p>
          )}
        </div>
        {registrations.length > 0 && (
          <PaginationControls
            itemLabel="sinh viên"
            onPageChange={setRegistrationPageIndex}
            onPageSizeChange={setRegistrationPageSize}
            pageIndex={registrationPageIndex}
            pageSize={registrationPageSize}
            totalItems={registrationTotalItems}
          />
        )}
      </Card>
    </div>
  );
}

export default ActivityDetailPage;
