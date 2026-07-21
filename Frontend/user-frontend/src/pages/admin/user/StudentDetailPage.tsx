import { KeyRound, Lock, RotateCcw, Save, Trash2, Unlock } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AutocompleteInput, { type AutocompleteOption } from "../../../components/AutocompleteInput";
import BackButton from "../../../components/BackButton";
import Card from "../../../components/Card";
import FormField from "../../../components/FormField";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import { authApi, classApi, userApi, type ClassResponse, type StudentGroupResponse, type UserProfile, type UserProfilePayload } from "../../../services/api";
import { defaultStudentGroups } from "../../../utils/studentGroups";
import { getZodMessage, userProfileSchema } from "../../../validation/userSchemas";

const emptyProfile: UserProfilePayload = {
  studentId: "",
  fullName: "",
  email: "",
  dob: "",
  gender: "MALE",
  contactPhone: "",
  studentStatus: "STUDYING",
};

const studentStatusOptions: Array<{ value: NonNullable<UserProfilePayload["studentStatus"]>; label: string }> = [
  { value: "STUDYING", label: "Đang học" },
  { value: "RESERVED", label: "Bảo lưu" },
  { value: "SUSPENDED", label: "Đình chỉ" },
  { value: "GRADUATED", label: "Đã tốt nghiệp" },
];

const genderOptions: Array<{ value: NonNullable<UserProfilePayload["gender"]>; label: string }> = [
  { value: "MALE", label: "Nam" },
  { value: "FEMALE", label: "Nữ" },
  { value: "OTHER", label: "Khác" },
];

function StudentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const profileId = id || "";
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState<UserProfilePayload>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [classes, setClasses] = useState<ClassResponse[]>([]);
  const [studentGroups, setStudentGroups] = useState<StudentGroupResponse[]>(defaultStudentGroups);
  const [classId, setClassId] = useState("");
  const [classSearch, setClassSearch] = useState("");
  const [studentGroupId, setStudentGroupId] = useState("1");

  const classOptions: AutocompleteOption[] = classes.map((clazz) => ({
    value: clazz.id,
    label: clazz.classCode,
    description: [clazz.faculty?.facultyCode, clazz.academicYear?.yearName].filter(Boolean).join(" · "),
    searchText: `${clazz.id} ${clazz.classCode} ${clazz.faculty?.facultyCode ?? ""} ${clazz.faculty?.facultyName ?? ""} ${clazz.academicYear?.yearName ?? ""}`,
  }));

  const resolveClassByInput = (value: string) => {
    const cleanValue = value.trim().toLowerCase();
    if (!cleanValue) return undefined;
    return classes.find((clazz) =>
      [clazz.id, clazz.classCode, `${clazz.classCode} - ${clazz.faculty?.facultyCode ?? ""}`]
        .map((item) => String(item ?? "").trim().toLowerCase())
        .includes(cleanValue),
    );
  };

  const updateClassSearch = (value: string) => {
    setClassSearch(value);
    const matchedClass = resolveClassByInput(value);
    setClassId(matchedClass?.id ?? "");
  };

  const loadProfile = useCallback(async () => {
    if (!profileId) {
      setMessage("ID sinh viên không hợp lệ.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const [data, classData] = await Promise.all([
        userApi.getById(profileId),
        classApi.list(),
      ]);
      const groupData = await userApi.listStudentGroups();
      setProfile(data);
      setClasses(classData);
      setStudentGroups(groupData.length ? groupData : defaultStudentGroups);
      setClassId(data.clazz?.id ? String(data.clazz.id) : "");
      setClassSearch(data.clazz?.classCode || "");
      setStudentGroupId(data.studentGroup?.id ? String(data.studentGroup.id) : data.studentGroup?.code || "1");
      setFormData({
        studentId: data.studentId,
        fullName: data.fullName,
        email: data.email || "",
        dob: data.dob || "",
        gender: data.gender || "MALE",
        contactPhone: data.contactPhone || "",
        studentStatus: data.studentStatus || "STUDYING",
      });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không tải được hồ sơ sinh viên.");
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadProfile]);

  const updateField = (field: keyof UserProfilePayload, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;

    setSaving(true);
    setMessage("");
    try {
      const matchedClass = resolveClassByInput(classSearch);
      if (classSearch.trim() && !matchedClass) {
        setMessage("Vui lòng chọn lớp từ danh sách gợi ý để tránh sai mã lớp.");
        return;
      }

      const validated = userProfileSchema.parse(formData);
      const payload: UserProfilePayload = {
        ...validated,
        clazz: matchedClass || classId ? { id: matchedClass?.id ?? classId } : undefined,
        studentGroup: studentGroupId ? { id: Number(studentGroupId) } : undefined,
      };
      const updated = await userApi.update(profile.id, payload);
      setProfile(updated);
      setClassId(updated.clazz?.id ? String(updated.clazz.id) : "");
      setClassSearch(updated.clazz?.classCode || "");
      setStudentGroupId(updated.studentGroup?.id ? String(updated.studentGroup.id) : updated.studentGroup?.code || "1");
      setMessage("Đã cập nhật hồ sơ sinh viên.");
    } catch (err) {
      setMessage(getZodMessage(err, err instanceof Error ? err.message : "Không cập nhật được hồ sơ."));
    } finally {
      setSaving(false);
    }
  };

  const runAuthAction = async (action: "reset" | "revoke" | "unlock") => {
    if (!profile) return;
    setMessage("");
    try {
      const result =
        action === "reset"
          ? await authApi.resetPassword(profile.studentId)
          : action === "revoke"
            ? await authApi.revokeUser(profile.studentId)
            : await authApi.unlockUser(profile.studentId);
      setMessage(result || "Thao tác tài khoản đã hoàn tất.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không thực hiện được thao tác tài khoản.");
    }
  };

  const handleDelete = async () => {
    if (!profile || !window.confirm(`Xóa hồ sơ sinh viên ${profile.fullName}?`)) return;

    try {
      await userApi.remove(profile.id);
      navigate("/admin/students", { replace: true });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không xóa được hồ sơ sinh viên.");
    }
  };

  return (
    <div className="space-y-gutter">
      <PageHeader
        title="Chi tiết hồ sơ sinh viên"
        subtitle="Xem, cập nhật hồ sơ sinh viên và quản lý trạng thái tài khoản đăng nhập."
      />

      <div className="flex flex-wrap gap-3">
        <BackButton to="/admin/students">Quay lại danh sách</BackButton>
        <button className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" onClick={loadProfile} type="button">
          <RotateCcw className="h-5 w-5" />
          Tải lại
        </button>
      </div>

      {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">{message}</div>}

      {loading ? (
        <div className="panel p-6 text-on-surface-variant">Đang tải hồ sơ...</div>
      ) : (
        <section className="grid gap-gutter xl:grid-cols-[1fr_360px]">
          <Card>
            <form className="grid gap-5 md:grid-cols-2" onSubmit={handleSave}>
              <FormField
                className="disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-on-surface-variant"
                disabled
                hint="Mã sinh viên không được thay đổi sau khi tạo hồ sơ."
                label="MSSV"
                onChange={(event) => updateField("studentId", event.target.value)}
                required
                value={formData.studentId}
              />
              <FormField label="Họ tên" onChange={(event) => updateField("fullName", event.target.value)} required value={formData.fullName} />
              <FormField label="Email sinh viên" onChange={(event) => updateField("email", event.target.value)} required type="email" value={formData.email} />
              <FormField label="Ngày sinh" onChange={(event) => updateField("dob", event.target.value)} type="date" value={formData.dob} />
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-on-surface">Giới tính</span>
                <select
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface focus-ring"
                  onChange={(event) => updateField("gender", event.target.value)}
                  value={formData.gender}
                >
                  {genderOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <FormField label="Số điện thoại" onChange={(event) => updateField("contactPhone", event.target.value)} placeholder="090..." value={formData.contactPhone} />
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-on-surface">Trạng thái</span>
                <select
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface focus-ring"
                  onChange={(event) => updateField("studentStatus", event.target.value)}
                  value={formData.studentStatus}
                >
                  {studentStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <AutocompleteInput
                emptyMessage="Không tìm thấy lớp phù hợp."
                hint="Bỏ trống nếu sinh viên chưa phân lớp."
                label="Lớp"
                onChange={updateClassSearch}
                onSelect={(option) => {
                  setClassId(option.value);
                  setClassSearch(option.label);
                }}
                options={classOptions}
                placeholder="Nhập mã lớp, VD: D22_TH01"
                value={classSearch}
              />
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-on-surface">Nhóm sinh viên</span>
                <select
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface focus-ring"
                  onChange={(event) => setStudentGroupId(event.target.value)}
                  value={studentGroupId}
                >
                  {studentGroups.map((group) => (
                    <option key={group.id ?? group.code} value={group.id ?? group.code}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="md:col-span-2 flex flex-wrap gap-3">
                <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary disabled:opacity-60" disabled={saving} type="submit">
                  <Save className="h-5 w-5" />
                  {saving ? "Đang lưu" : "Lưu hồ sơ"}
                </button>
                <button className="inline-flex items-center gap-2 rounded-lg px-4 py-3 font-semibold text-error hover:bg-error-container" onClick={handleDelete} type="button">
                  <Trash2 className="h-5 w-5" />
                  Xóa hồ sơ
                </button>
              </div>
            </form>
          </Card>

          <div className="space-y-gutter">
            <Card>
              <p className="text-sm font-semibold text-primary">Tài khoản đăng nhập</p>
              <h2 className="mt-2 text-xl font-bold text-on-surface">{profile?.studentId}</h2>
              <p className="mt-2 text-sm text-on-surface-variant">{profile?.email || `${profile?.studentId}@student.edu.vn`}</p>
              <div className="mt-4">{profile?.studentStatus && <StatusBadge status={profile.studentStatus} />}</div>
            </Card>

            <Card>
              <h2 className="text-lg font-bold text-on-surface">Thao tác tài khoản</h2>
              <div className="mt-5 grid gap-3">
                <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" onClick={() => void runAuthAction("reset")} type="button">
                  <KeyRound className="h-5 w-5" />
                  Reset mật khẩu
                </button>
                <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" onClick={() => void runAuthAction("unlock")} type="button">
                  <Unlock className="h-5 w-5" />
                  Mở khóa tài khoản
                </button>
                <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-error-container px-4 py-3 font-semibold text-error" onClick={() => void runAuthAction("revoke")} type="button">
                  <Lock className="h-5 w-5" />
                  Khóa tài khoản
                </button>
              </div>
            </Card>
          </div>
        </section>
      )}
    </div>
  );
}

export default StudentDetailPage;
