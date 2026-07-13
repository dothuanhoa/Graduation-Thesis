import { KeyRound, Lock, RotateCcw, Save, Trash2, Unlock } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Card from "../../../components/Card";
import FormField from "../../../components/FormField";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import { authApi, classApi, userApi, type ClassResponse, type StudentGroupResponse, type UserProfile, type UserProfilePayload } from "../../../services/api";
import { defaultStudentGroups } from "../../../utils/studentGroups";
import { userProfileSchema } from "../../../validation/userSchemas";

const emptyProfile: UserProfilePayload = {
  studentId: "",
  fullName: "",
  dob: "",
  gender: "MALE",
  contactPhone: "",
  studentStatus: "STUDYING",
};

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
  const [studentGroupId, setStudentGroupId] = useState("1");

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
      setStudentGroupId(data.studentGroup?.id ? String(data.studentGroup.id) : data.studentGroup?.code || "1");
      setFormData({
        studentId: data.studentId,
        fullName: data.fullName,
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
      const validated = userProfileSchema.parse(formData);
      const payload: UserProfilePayload = {
        ...validated,
        clazz: classId ? { id: classId } : undefined,
        studentGroup: studentGroupId ? { id: Number(studentGroupId) } : undefined,
      };
      const updated = await userApi.update(profile.id, payload);
      setProfile(updated);
      setClassId(updated.clazz?.id ? String(updated.clazz.id) : "");
      setStudentGroupId(updated.studentGroup?.id ? String(updated.studentGroup.id) : updated.studentGroup?.code || "1");
      setMessage("Đã cập nhật hồ sơ sinh viên.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không cập nhật được hồ sơ.");
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
        <Link className="rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" to="/admin/students">
          Quay lại danh sách
        </Link>
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
              <FormField label="MSSV" onChange={(event) => updateField("studentId", event.target.value)} required value={formData.studentId} />
              <FormField label="Họ tên" onChange={(event) => updateField("fullName", event.target.value)} required value={formData.fullName} />
              <FormField label="Ngày sinh" onChange={(event) => updateField("dob", event.target.value)} type="date" value={formData.dob} />
              <FormField as="select" label="Giới tính" onChange={(event) => updateField("gender", event.target.value)} options={["MALE", "FEMALE", "OTHER"]} value={formData.gender} />
              <FormField label="Số điện thoại" onChange={(event) => updateField("contactPhone", event.target.value)} placeholder="090..." value={formData.contactPhone} />
              <FormField
                as="select"
                label="Trạng thái"
                onChange={(event) => updateField("studentStatus", event.target.value)}
                options={["STUDYING", "RESERVED", "SUSPENDED", "GRADUATED"]}
                value={formData.studentStatus}
              />
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-on-surface">Lớp</span>
                <select
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface focus-ring"
                  onChange={(event) => setClassId(event.target.value)}
                  value={classId}
                >
                  <option value="">Chưa phân lớp</option>
                  {classes.map((clazz) => (
                    <option key={clazz.id} value={clazz.id}>
                      {clazz.classCode}{clazz.faculty ? ` - ${clazz.faculty.facultyCode}` : ""}
                    </option>
                  ))}
                </select>
              </label>
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
              <p className="mt-2 text-sm text-on-surface-variant">{profile?.studentId}@student.stu.edu.vn</p>
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
