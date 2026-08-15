import { BarcodeFormat, QRCodeWriter } from "@zxing/library";
import {
  Download,
  PlayCircle,
  QrCode,
  Save,
  SquareCheckBig,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
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
  type ActivityAttendanceSession,
  type ActivityCategory,
  type ActivityCheckerPayload,
  type ActivityCheckerResponse,
  type ActivityPayload,
  type ActivityQrSessionResponse,
  type ActivityParticipationType,
  type ActivityRegistrationResponse,
  type ActivityResponse,
  type ActivityStatus,
  type UserProfile,
} from "../../../services/api";
import {
  activityCategoryLabels,
  activityParticipationLabels,
  formatDateTime,
  toApiDateTime,
  toInputDateTime,
} from "../../../utils/activityUi";
import { exportXlsxFile, safeFileName } from "../../../utils/xlsxExport";
import { toUserFacingMessage } from "../../../utils/messages";
import { emitToast } from "../../../utils/toastBus";
import {
  activitySchema,
  checkerSchema,
} from "../../../validation/activitySchemas";
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

const emptyChecker: ActivityCheckerPayload = {
  checkerCode: "",
  checkerName: "",
};

const toForm = (activity: ActivityResponse): ActivityFormState => ({
  title: activity.title,
  category: activity.category,
  participationType: activity.participationType || "LIMITED",
  reward: activity.reward || "",
  location: activity.location || "",
  registrationStartTime: toInputDateTime(activity.registrationStartTime),
  registrationEndTime: toInputDateTime(activity.registrationEndTime),
  startTime: toInputDateTime(activity.startTime),
  endTime: toInputDateTime(activity.endTime),
  capacity: activity.capacity ? String(activity.capacity) : "",
  attendanceSessionCount:
    activity.participationType === "OPEN"
      ? "1"
      : String(activity.attendanceSessionCount || 2),
});

const toPayload = (form: ActivityFormState): ActivityPayload => ({
  title: form.title.trim(),
  category: form.category,
  participationType: form.participationType,
  reward: form.reward.trim(),
  googleFormUrl: "",
  registrationStartTime:
    form.participationType === "LIMITED"
      ? toApiDateTime(form.registrationStartTime)
      : undefined,
  registrationEndTime:
    form.participationType === "LIMITED"
      ? toApiDateTime(form.registrationEndTime)
      : undefined,
  location: form.location.trim(),
  startTime: toApiDateTime(form.startTime),
  endTime: toApiDateTime(form.endTime),
  capacity:
    form.participationType === "LIMITED" ? Number(form.capacity) : undefined,
  attendanceSessionCount:
    form.participationType === "LIMITED"
      ? Number(form.attendanceSessionCount || 2)
      : 1,
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

type QrAttendanceSession = Exclude<ActivityAttendanceSession, "FACE">;

const attendanceSessionLabels: Record<QrAttendanceSession, string> = {
  MIDDLE: "Gi\u1eefa gi\u1edd",
  FINAL: "Cu\u1ed1i gi\u1edd",
};

const attendanceResultLabels: Record<string, string> = {
  NOT_ATTENDED: "Ch\u01b0a \u0111i\u1ec3m danh",
  FACE_NOT_VERIFIED: "Ch\u01b0a x\u00e1c th\u1ef1c khu\u00f4n m\u1eb7t",
  INCOMPLETE: "\u0110i\u1ec3m danh kh\u00f4ng \u0111\u1ee7",
  ATTENDED: "\u0110\u00e3 \u0111i\u1ec3m danh",
};

const activityCategoryOptions = Object.entries(activityCategoryLabels).map(
  ([value, label]) => ({ value, label }),
);

const formatAttendanceResult = (registration: ActivityRegistrationResponse) =>
  attendanceResultLabels[registration.attendanceResult || ""] ||
  (registration.attended
    ? "\u0110\u00e3 \u0111i\u1ec3m danh"
    : "Ch\u01b0a \u0111i\u1ec3m danh");

const exportSortCollator = new Intl.Collator("vi-VN", {
  numeric: true,
  sensitivity: "base",
});

const formatExportAttendanceStatus = (
  registration: ActivityRegistrationResponse,
) => {
  if (registration.attendanceResult === "ATTENDED") {
    return "Đủ";
  }
  if (
    registration.attendanceResult === "NOT_ATTENDED" ||
    (!registration.attendanceResult && !registration.attended)
  ) {
    return "Vắng";
  }
  return "Thiếu";
};

const formatExportResult = (
  activity: ActivityResponse,
  registration: ActivityRegistrationResponse,
) =>
  formatExportAttendanceStatus(registration) === "Đủ"
    ? activity.reward || ""
    : "Xử lý kỷ luật";

const compareExportRegistrations = (
  left: ActivityRegistrationResponse,
  right: ActivityRegistrationResponse,
) => {
  const leftClass = left.classCode || "\uffff";
  const rightClass = right.classCode || "\uffff";
  const classCompare = exportSortCollator.compare(leftClass, rightClass);
  if (classCompare !== 0) return classCompare;
  return exportSortCollator.compare(left.studentCode || "", right.studentCode || "");
};

const formatAttendanceMark = (done: boolean, time?: string) =>
  done ? `C\u00f3${time ? ` - ${formatDateTime(time)}` : ""}` : "-";

const toQrImageDataUrl = (payload: string) => {
  const matrix = new QRCodeWriter().encode(
    payload,
    BarcodeFormat.QR_CODE,
    220,
    220,
    new Map(),
  );
  const width = matrix.getWidth();
  const height = matrix.getHeight();
  const cells: string[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (matrix.get(x, y)) {
        cells.push(`M${x},${y}h1v1h-1z`);
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="white"/><path d="${cells.join("")}" fill="black"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const throwProfileValidation = (message: string): never => {
  const userMessage = toUserFacingMessage(message);
  emitToast({ variant: "warning", message: userMessage });
  throw new Error(userMessage);
};

const requireMatchingProfile = (
  profile: UserProfile | null,
  code: string,
  fullName: string,
  subjectLabel: string,
): UserProfile => {
  const cleanCode = code.trim();
  const cleanName = fullName.trim();

  if (!profile) {
    throwProfileValidation(
      `Không tìm thấy ${subjectLabel} có mã ${cleanCode}.`,
    );
  }

  const matchedProfile = profile as UserProfile;

  if (
    normalizeLookupText(matchedProfile.studentId) !==
    normalizeLookupText(cleanCode)
  ) {
    throwProfileValidation(`Mã ${subjectLabel} không khớp với hồ sơ.`);
  }

  if (
    normalizeLookupText(matchedProfile.fullName) !==
    normalizeLookupText(cleanName)
  ) {
    throwProfileValidation(
      `Họ tên không khớp với MSSV ${cleanCode}. Họ tên trong hồ sơ: ${matchedProfile.fullName}.`,
    );
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

function StudentAutocompleteField({
  label,
  value,
  profiles,
  placeholder,
  onChange,
  onSelect,
}: StudentAutocompleteFieldProps) {
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
            <p className="px-3 py-2 text-sm text-on-surface-variant">
              Không tìm thấy sinh viên phù hợp.
            </p>
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
                <span className="font-semibold text-on-surface">
                  {profile.fullName}
                </span>
                <span className="text-sm font-semibold text-primary">
                  {profile.studentId}
                </span>
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
  const [registrations, setRegistrations] = useState<
    ActivityRegistrationResponse[]
  >([]);
  const [checkers, setCheckers] = useState<ActivityCheckerResponse[]>([]);
  const [studentProfiles, setStudentProfiles] = useState<UserProfile[]>([]);
  const [checkerForm, setCheckerForm] =
    useState<ActivityCheckerPayload>(emptyChecker);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportingActivityDetail, setExportingActivityDetail] = useState(false);
  const [message, setMessage] = useState("");
  const [qrTtlMinutes, setQrTtlMinutes] = useState("10");
  const [qrSession, setQrSession] = useState<ActivityQrSessionResponse | null>(
    null,
  );
  const [creatingQrSession, setCreatingQrSession] = useState<
    QrAttendanceSession | ""
  >("");

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
      setMessage(
        err instanceof Error
          ? err.message
          : "Không tải được chi tiết hoạt động.",
      );
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

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
          setStudentProfiles(
            profiles.filter((profile) => profile.studentId && profile.fullName),
          );
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
            ...(field === "participationType" && value === "OPEN"
              ? {
                  capacity: "",
                  registrationStartTime: "",
                  registrationEndTime: "",
                  attendanceSessionCount: "1",
                }
              : {}),
            ...(field === "participationType" && value === "LIMITED"
              ? {
                  attendanceSessionCount:
                    current.attendanceSessionCount === "1"
                      ? "2"
                      : current.attendanceSessionCount,
                }
              : {}),
          }
        : current,
    );
  };

  const updateCheckerField = (
    field: keyof ActivityCheckerPayload,
    value: string,
  ) => {
    setCheckerForm((current) => ({ ...current, [field]: value }));
  };

  const selectCheckerProfile = (profile: UserProfile) => {
    setCheckerForm({
      checkerCode: profile.studentId,
      checkerName: profile.fullName,
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
      setMessage(
        getZodMessage(
          err,
          err instanceof Error ? err.message : "Không cập nhật được hoạt động.",
        ),
      );
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
      setMessage(
        err instanceof Error
          ? err.message
          : "Không đổi được trạng thái hoạt động.",
      );
    }
  };

  const deleteActivity = async () => {
    if (
      !activity ||
      !id ||
      !window.confirm(`Xóa hoạt động "${activity.title}"?`)
    )
      return;

    setMessage("");
    try {
      await activityApi.remove(id);
      navigate("/admin/activities");
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Không xóa được hoạt động.",
      );
    }
  };

  const resolveRegistrationClassCode = async (
    registration: ActivityRegistrationResponse,
  ) => {
    if (registration.classCode?.trim()) {
      return registration.classCode.trim();
    }

    const profileFromList = studentProfiles.find(
      (profile) =>
        normalizeLookupText(profile.studentId) ===
        normalizeLookupText(registration.studentCode),
    );
    const listClassCode = profileFromList?.clazz?.classCode?.trim();
    if (listClassCode) {
      return listClassCode;
    }

    try {
      const profile = await userApi.getByStudentId(registration.studentCode, {
        suppressToast: true,
      });
      return profile?.clazz?.classCode?.trim() || "";
    } catch {
      return "";
    }
  };

  const exportActivityDetail = async () => {
    if (!activity) return;
    if (activity.status !== "COMPLETED") {
      const userMessage = "Chỉ xuất Excel khi hoạt động đã hoàn thành.";
      setMessage(userMessage);
      emitToast({ variant: "warning", message: userMessage });
      return;
    }

    const participationType = activity.participationType || "LIMITED";
    const attendanceCount =
      activity.attendanceSessionCount || (participationType === "OPEN" ? 1 : 2);

    setExportingActivityDetail(true);
    setMessage("Đang chuẩn bị file Excel tổng kết hoạt động...");
    try {
      const enrichedRegistrations = await Promise.all(
        registrations.map(async (registration) => ({
          ...registration,
          classCode: await resolveRegistrationClassCode(registration),
        })),
      );
      setRegistrations(enrichedRegistrations);

      const sortedRegistrations = [...enrichedRegistrations].sort(
        compareExportRegistrations,
      );
      const attended = sortedRegistrations.filter(
        (registration) => formatExportAttendanceStatus(registration) === "Đủ",
      ).length;
      const incomplete = sortedRegistrations.filter(
        (registration) => formatExportAttendanceStatus(registration) === "Thiếu",
      ).length;
      const absent = sortedRegistrations.filter(
        (registration) => formatExportAttendanceStatus(registration) === "Vắng",
      ).length;

      exportXlsxFile(
        `tong-ket-hoat-dong-${safeFileName(activity.title || "hoat-dong")}.xlsx`,
        [
          {
            name: "Tong ket",
            rows: [
              ["Hoạt động", activity.title],
              ["Loại", activityCategoryLabels[activity.category]],
              ["Hình thức", activityParticipationLabels[participationType]],
              ["Số lần điểm danh", attendanceCount],
              [
                "Mở đăng ký",
                participationType === "LIMITED"
                  ? formatDateTime(activity.registrationStartTime)
                  : "Không áp dụng",
              ],
              [
                "Đóng đăng ký",
                participationType === "LIMITED"
                  ? formatDateTime(activity.registrationEndTime)
                  : "Không áp dụng",
              ],
              ["Thời gian bắt đầu", formatDateTime(activity.startTime)],
              ["Thời gian kết thúc", formatDateTime(activity.endTime)],
              ["Địa điểm", activity.location || ""],
              ["Điểm cộng", activity.reward || ""],
              ["Tổng số sinh viên", sortedRegistrations.length],
              ["Đủ", attended],
              ["Thiếu", incomplete],
              ["Vắng", absent],
            ],
          },
          {
            name: "Danh sach",
            columnWidths: [18, 30, 18, 16, 32],
            rows: [
              ["MSSV", "Họ và tên", "Lớp", "Điểm danh", "Kết quả"],
              ...sortedRegistrations.map((registration) => [
                registration.studentCode,
                registration.fullName,
                registration.classCode || "",
                formatExportAttendanceStatus(registration),
                formatExportResult(activity, registration),
              ]),
            ],
          },
        ],
      );
      setMessage("Đã xuất file Excel tổng kết hoạt động.");
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Không xuất được file Excel tổng kết hoạt động.",
      );
    } finally {
      setExportingActivityDetail(false);
    }
  };

  const createQrSession = async (session: QrAttendanceSession) => {
    if (!id) return;
    const minutes = Number(qrTtlMinutes || 10);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 240) {
      setMessage("Thời gian tồn tại QR phải từ 1 đến 240 phút.");
      return;
    }

    setCreatingQrSession(session);
    setMessage("");
    try {
      const created = await activityApi.createQrSession(id, {
        session,
        expiresInMinutes: minutes,
        locationRequired: false,
      });
      setQrSession(created);
      const updated = await activityApi.get(id).catch(() => null);
      if (updated) {
        setActivity(updated);
        setForm(toForm(updated));
      }
      setMessage(
        `Đã tạo QR ${attendanceSessionLabels[session].toLowerCase()}.`,
      );
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Không tạo được QR điểm danh.",
      );
    } finally {
      setCreatingQrSession("");
    }
  };

  const addChecker = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id) return;

    setMessage("");
    try {
      const validated = checkerSchema.parse(checkerForm);
      const profile = await userApi.getByStudentId(
        validated.checkerCode.trim(),
      );
      const matchedProfile = requireMatchingProfile(
        profile,
        validated.checkerCode,
        validated.checkerName,
        "người điểm danh",
      );
      const created = await activityApi.addChecker(id, {
        checkerCode: matchedProfile.studentId,
        checkerName: matchedProfile.fullName,
      });
      setCheckers((current) => [...current, created]);
      setCheckerForm(emptyChecker);
      setMessage("Đã thêm người điểm danh.");
    } catch (err) {
      setMessage(
        getZodMessage(
          err,
          err instanceof Error
            ? err.message
            : "Không thêm được người điểm danh.",
        ),
      );
    }
  };

  const removeChecker = async (checker: ActivityCheckerResponse) => {
    if (!id || !window.confirm(`Gỡ người điểm danh ${checker.checkerName}?`))
      return;

    setMessage("");
    try {
      await activityApi.removeChecker(id, checker.id);
      setCheckers((current) =>
        current.filter((item) => item.id !== checker.id),
      );
      setMessage("Đã gỡ người điểm danh.");
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Không gỡ được người điểm danh.",
      );
    }
  };

  const adjustFaceVerification = async (
    registration: ActivityRegistrationResponse,
    faceVerified: boolean,
  ) => {
    if (!id) return;
    const note = window.prompt(
      faceVerified
        ? "Ghi chú xác nhận khuôn mặt đạt"
        : "Ghi chú điều chỉnh khuôn mặt không đạt",
      faceVerified
        ? "Đã đối chiếu minh chứng tại phòng CTSV"
        : "Điều chỉnh sau khi rà soát minh chứng",
    );
    if (note === null) return;

    setMessage("");
    try {
      const updated = await activityApi.updateFaceVerification(
        id,
        registration.id,
        {
          faceVerified,
          note: note.trim(),
        },
      );
      setRegistrations((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setMessage("Đã cập nhật kết quả xác thực khuôn mặt.");
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Không cập nhật được kết quả xác thực khuôn mặt.",
      );
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
    return (
      <div className="panel p-6 text-on-surface-variant">
        Đang tải chi tiết hoạt động...
      </div>
    );
  }

  if (!activity || !form) {
    return (
      <div className="space-y-gutter">
        <PageHeader
          title="Không tìm thấy hoạt động"
          subtitle="Hoạt động này không còn tồn tại hoặc bạn không có quyền xem."
        />
        {message && (
          <div className="rounded-lg bg-error-container px-4 py-3 text-sm font-semibold text-error">
            {message}
          </div>
        )}
        <BackButton to="/admin/activities">Quay lại danh sách</BackButton>
      </div>
    );
  }

  const statusTarget = nextStatus(activity.status);
  const checkedInCount = registrations.filter(
    (registration) => registration.attended,
  ).length;
  const attendanceSessionCount =
    activity.attendanceSessionCount ||
    ((activity.participationType || "LIMITED") === "OPEN" ? 1 : 2);
  const isLimitedActivity =
    (activity.participationType || "LIMITED") === "LIMITED";

  return (
    <div className="space-y-gutter">
      <PageHeader
        title={activity.title}
        subtitle="Quản lý chi tiết hoạt động, cấu hình đăng ký, người điểm danh và trạng thái tổ chức."
      />

      <div className="flex flex-wrap items-center gap-3">
        <BackButton to="/admin/activities">Quay lại danh sách</BackButton>
        <StatusBadge status={activity.status} />
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60"
          disabled={activity.status !== "COMPLETED" || exportingActivityDetail}
          onClick={() => void exportActivityDetail()}
          title={
            activity.status === "COMPLETED"
              ? "Xuất danh sách tổng kết hoạt động"
              : "Chỉ xuất Excel khi hoạt động đã hoàn thành"
          }
          type="button"
        >
          <Download className="h-5 w-5" />
          {exportingActivityDetail ? "Đang xuất..." : "Xuất Excel"}
        </button>
      </div>

      {message && (
        <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">
          {message}
        </div>
      )}

      <div className="grid gap-gutter xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-primary">
                Thông tin hoạt động
              </p>
              <h2 className="text-xl font-bold text-on-surface">
                {activityCategoryLabels[activity.category]}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {statusTarget && (
                <button
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-on-primary"
                  onClick={changeStatus}
                  type="button"
                >
                  {statusTarget === "ONGOING" ? (
                    <PlayCircle className="h-5 w-5" />
                  ) : (
                    <SquareCheckBig className="h-5 w-5" />
                  )}
                  {statusTarget === "ONGOING" ? "Bắt đầu" : "Hoàn thành"}
                </button>
              )}
              <button
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-semibold text-error hover:bg-error-container"
                onClick={deleteActivity}
                type="button"
              >
                <Trash2 className="h-5 w-5" />
                Xóa
              </button>
            </div>
          </div>

          <form className="grid gap-5 md:grid-cols-2" onSubmit={handleSave}>
            <FormField
              label="Tên hoạt động"
              onChange={(event) => updateField("title", event.target.value)}
              required
              value={form.title}
            />
            <FormField
              as="select"
              label="Loại hoạt động"
              onChange={(event) => updateField("category", event.target.value)}
              options={activityCategoryOptions}
              value={form.category}
            />
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-on-surface">
                Hình thức tham gia
              </span>
              <select
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface focus-ring disabled:opacity-70"
                disabled={
                  activity.status !== "UPCOMING" || registrations.length > 0
                }
                onChange={(event) =>
                  updateField("participationType", event.target.value)
                }
                value={form.participationType}
              >
                <option value="LIMITED">Giới hạn đăng ký</option>
                <option value="OPEN">Tự do tham gia</option>
              </select>
              {registrations.length > 0 && (
                <span className="text-xs text-on-surface-variant">
                  Đã có sinh viên đăng ký/điểm danh nên không được đổi hình
                  thức.
                </span>
              )}
            </label>
            <FormField
              label="Điểm rèn luyện"
              onChange={(event) => updateField("reward", event.target.value)}
              required
              value={form.reward}
            />
            {form.participationType === "LIMITED" && (
              <>
                <FormField
                  label="Thời gian mở đăng ký"
                  onChange={(event) =>
                    updateField("registrationStartTime", event.target.value)
                  }
                  required
                  type="datetime-local"
                  value={form.registrationStartTime}
                />
                <FormField
                  label="Thời gian đóng đăng ký"
                  onChange={(event) =>
                    updateField("registrationEndTime", event.target.value)
                  }
                  required
                  type="datetime-local"
                  value={form.registrationEndTime}
                />
                <FormField
                  label="Số lượng tối đa"
                  min={Math.max(registrations.length, 1)}
                  onChange={(event) =>
                    updateField("capacity", event.target.value)
                  }
                  required
                  type="number"
                  value={form.capacity}
                />
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-on-surface">
                    Số lần điểm danh
                  </span>
                  <select
                    className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface focus-ring disabled:opacity-70"
                    disabled={
                      activity.status !== "UPCOMING" ||
                      registrations.some(
                        (registration) =>
                          registration.faceVerified ||
                          registration.middleAttended ||
                          registration.finalAttended,
                      )
                    }
                    onChange={(event) =>
                      updateField("attendanceSessionCount", event.target.value)
                    }
                    value={form.attendanceSessionCount}
                  >
                    <option value="2">
                      2 lần: khuôn mặt đầu giờ + QR cuối giờ
                    </option>
                    <option value="3">
                      3 lần: khuôn mặt đầu giờ + QR giữa giờ + QR cuối giờ
                    </option>
                  </select>
                </label>
              </>
            )}
            <FormField
              label="Thời gian bắt đầu hoạt động"
              onChange={(event) => updateField("startTime", event.target.value)}
              required
              type="datetime-local"
              value={form.startTime}
            />
            <FormField
              label="Thời gian kết thúc hoạt động"
              onChange={(event) => updateField("endTime", event.target.value)}
              required
              type="datetime-local"
              value={form.endTime}
            />
            <FormField
              label="Địa điểm"
              onChange={(event) => updateField("location", event.target.value)}
              required
              value={form.location}
            />
            {form.participationType === "OPEN" && (
              <div className="rounded-lg bg-surface-container-low p-4 text-sm text-on-surface-variant">
                Hoạt động tự do không có danh sách đăng ký trước. Checker xác
                thực khuôn mặt một lần để ghi nhận sinh viên tham gia.
              </div>
            )}
            <div className="md:col-span-2">
              <button
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary disabled:opacity-60"
                disabled={saving}
                type="submit"
              >
                <Save className="h-5 w-5" />
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </Card>

        <Card>
          <p className="text-sm font-semibold text-primary">Thống kê</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-surface-container-low p-4">
              <p className="text-2xl font-bold text-on-surface">
                {registrations.length}
              </p>
              <p className="text-xs text-on-surface-variant">
                {isLimitedActivity ? "Đăng ký" : "Đã ghi nhận"}
              </p>
            </div>
            <div className="rounded-lg bg-surface-container-low p-4">
              <p className="text-2xl font-bold text-on-surface">
                {checkedInCount}
              </p>
              <p className="text-xs text-on-surface-variant">Đã điểm danh</p>
            </div>
            <div className="rounded-lg bg-surface-container-low p-4">
              <p className="text-2xl font-bold text-on-surface">
                {checkers.length}
              </p>
              <p className="text-xs text-on-surface-variant">Người xác thực</p>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-sm text-on-surface-variant">
            <p>
              Hình thức:{" "}
              {
                activityParticipationLabels[
                  activity.participationType || "LIMITED"
                ]
              }
            </p>
            {isLimitedActivity && (
              <>
                <p>
                  Mở đăng ký: {formatDateTime(activity.registrationStartTime)}
                </p>
                <p>
                  Đóng đăng ký: {formatDateTime(activity.registrationEndTime)}
                </p>
                <p>
                  Còn trống:{" "}
                  {activity.remainingSlots ??
                    Math.max(
                      (activity.capacity ?? 0) - registrations.length,
                      0,
                    )}{" "}
                  slot
                </p>
              </>
            )}
            <p>Bắt đầu: {formatDateTime(activity.startTime)}</p>
            <p>Kết thúc: {formatDateTime(activity.endTime)}</p>
            <p>Địa điểm: {activity.location || "Chưa cập nhật"}</p>
          </div>
        </Card>
      </div>

      {isLimitedActivity && (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary">QR điểm danh</p>
              <h2 className="text-xl font-bold text-on-surface">
                Tạo QR điểm danh
              </h2>
              <p className="mt-2 text-sm text-on-surface-variant">
                Hoạt động đăng ký luôn xác thực khuôn mặt đầu giờ; QR được dùng
                cho giữa giờ hoặc cuối giờ theo số lần điểm danh đã chọn.
              </p>
            </div>
            <label className="flex min-w-48 flex-col gap-1.5">
              <span className="text-sm font-semibold text-on-surface">
                Thời gian tồn tại QR (phút)
              </span>
              <input
                className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface focus-ring"
                min={1}
                max={240}
                onChange={(event) => setQrTtlMinutes(event.target.value)}
                type="number"
                value={qrTtlMinutes}
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {attendanceSessionCount === 3 && (
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary disabled:opacity-60"
                disabled={
                  activity.status !== "ONGOING" ||
                  creatingQrSession === "MIDDLE"
                }
                onClick={() => void createQrSession("MIDDLE")}
                type="button"
              >
                <QrCode className="h-5 w-5" />
                {creatingQrSession === "MIDDLE"
                  ? "Đang tạo..."
                  : "Tạo QR giữa giờ"}
              </button>
            )}
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary disabled:opacity-60"
              disabled={
                activity.status !== "ONGOING" || creatingQrSession === "FINAL"
              }
              onClick={() => void createQrSession("FINAL")}
              type="button"
            >
              <QrCode className="h-5 w-5" />
              {creatingQrSession === "FINAL"
                ? "Đang tạo..."
                : "Tạo QR cuối giờ"}
            </button>
          </div>

          {activity.status !== "ONGOING" && (
            <p className="mt-3 text-sm text-on-surface-variant">
              Chỉ tạo QR khi hoạt động đang diễn ra.
            </p>
          )}

          {qrSession && (
            <div className="mt-5 grid gap-4 rounded-lg border border-outline-variant p-4 md:grid-cols-[auto_1fr]">
              <img
                alt="QR điểm danh"
                className="h-56 w-56 rounded-lg border border-outline-variant bg-white p-3"
                src={toQrImageDataUrl(qrSession.qrPayload)}
              />
              <div className="space-y-2 text-sm text-on-surface-variant">
                <p className="text-base font-semibold text-on-surface">
                  {
                    attendanceSessionLabels[
                      qrSession.session as QrAttendanceSession
                    ]
                  }
                </p>
                <p>Hết hạn: {formatDateTime(qrSession.expiresAt)}</p>
                <p className="break-all rounded-lg bg-surface-container-low p-3 font-mono text-xs">
                  {qrSession.qrPayload}
                </p>
              </div>
            </div>
          )}
        </Card>
      )}

      <Card>
        <div className="mb-5">
          <p className="text-sm font-semibold text-primary">Người điểm danh</p>
          <h2 className="text-xl font-bold text-on-surface">
            Phân quyền xác thực đầu vào cho hoạt động
          </h2>
        </div>
        <form
          className="grid gap-4 md:grid-cols-[1fr_1.2fr_auto]"
          onSubmit={addChecker}
        >
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
          <button
            className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary"
            type="submit"
          >
            <UserPlus className="h-5 w-5" />
            Thêm
          </button>
        </form>

        <div className="mt-5 divide-y divide-outline-variant">
          {checkers.length === 0 ? (
            <p className="py-4 text-sm text-on-surface-variant">
              Chưa có người điểm danh.
            </p>
          ) : (
            paginatedCheckers.map((checker) => (
              <div
                key={checker.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div>
                  <p className="font-semibold text-on-surface">
                    {checker.checkerName}
                  </p>
                  <p className="text-sm text-on-surface-variant">
                    {checker.checkerCode}
                  </p>
                </div>
                <button
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-error hover:bg-error-container"
                  onClick={() => void removeChecker(checker)}
                  type="button"
                >
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
          <h2 className="text-lg font-semibold text-on-surface">
            {isLimitedActivity
              ? "Danh sách sinh viên đăng ký"
              : "Danh sách sinh viên đã điểm danh"}
          </h2>
          {isLimitedActivity && (
            <p className="mt-2 text-sm text-on-surface-variant">
              Danh sách này được sinh viên tự đăng ký trực tiếp trên hệ thống.
              Admin chỉ được xem và xuất báo cáo, không được thêm, sửa hoặc gỡ
              sinh viên khỏi danh sách.
            </p>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-5 py-4 font-semibold text-on-surface">
                  MSSV
                </th>
                <th className="px-5 py-4 font-semibold text-on-surface">
                  Họ tên
                </th>
                <th className="px-5 py-4 font-semibold text-on-surface">
                  Xác thực khuôn mặt
                </th>
                {attendanceSessionCount === 3 && (
                  <th className="px-5 py-4 font-semibold text-on-surface">
                    QR giữa giờ
                  </th>
                )}
                {attendanceSessionCount >= 2 && (
                  <th className="px-5 py-4 font-semibold text-on-surface">
                    QR cuối giờ
                  </th>
                )}
                <th className="px-5 py-4 font-semibold text-on-surface">
                  Kết quả
                </th>
                <th className="px-5 py-4 font-semibold text-on-surface">
                  Thời gian cuối
                </th>
                <th className="px-5 py-4 font-semibold text-on-surface">
                  Điều chỉnh
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedRegistrations.map((registration) => (
                <tr
                  key={registration.id}
                  className="border-t border-outline-variant"
                >
                  <td className="px-5 py-4 font-semibold text-on-surface">
                    {registration.studentCode}
                  </td>
                  <td className="px-5 py-4 text-on-surface-variant">
                    {registration.fullName}
                  </td>
                  <td className="px-5 py-4 text-on-surface-variant">
                    {formatAttendanceMark(
                      Boolean(registration.faceVerified),
                      registration.faceVerifiedTime,
                    )}
                  </td>
                  {attendanceSessionCount === 3 && (
                    <td className="px-5 py-4 text-on-surface-variant">
                      {formatAttendanceMark(
                        Boolean(registration.middleAttended),
                        registration.middleCheckinTime,
                      )}
                    </td>
                  )}
                  {attendanceSessionCount >= 2 && (
                    <td className="px-5 py-4 text-on-surface-variant">
                      {formatAttendanceMark(
                        Boolean(registration.finalAttended),
                        registration.finalCheckinTime,
                      )}
                    </td>
                  )}
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${registration.attendanceResult === "ATTENDED" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}
                    >
                      {formatAttendanceResult(registration)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-on-surface-variant">
                    {registration.checkinTime
                      ? formatDateTime(registration.checkinTime)
                      : "-"}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                        onClick={() =>
                          void adjustFaceVerification(registration, true)
                        }
                        type="button"
                      >
                        Xác thực đạt
                      </button>
                      <button
                        className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                        onClick={() =>
                          void adjustFaceVerification(registration, false)
                        }
                        type="button"
                      >
                        Không đạt
                      </button>
                    </div>
                    {registration.faceVerificationNote && (
                      <p className="mt-2 max-w-xs text-xs text-on-surface-variant">
                        {registration.faceVerificationNote}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {registrations.length === 0 && (
            <p className="px-5 py-6 text-sm text-on-surface-variant">
              {isLimitedActivity
                ? "Chưa có sinh viên đăng ký."
                : "Chưa có sinh viên nào điểm danh."}
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
