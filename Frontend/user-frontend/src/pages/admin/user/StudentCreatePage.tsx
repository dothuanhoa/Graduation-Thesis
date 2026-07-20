import { Save } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import AutocompleteInput, { type AutocompleteOption } from "../../../components/AutocompleteInput";
import BackButton from "../../../components/BackButton";
import Card from "../../../components/Card";
import FormField from "../../../components/FormField";
import PageHeader from "../../../components/PageHeader";
import { classApi, userApi, type ClassResponse, type StudentGroupResponse, type UserProfilePayload } from "../../../services/api";
import { defaultStudentGroups } from "../../../utils/studentGroups";
import { getZodMessage, userProfileSchema } from "../../../validation/userSchemas";

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

function StudentCreatePage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<UserProfilePayload>({
    studentId: "",
    fullName: "",
    email: "",
    dob: "",
    gender: "MALE",
    contactPhone: "",
    studentStatus: "STUDYING",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<ClassResponse[]>([]);
  const [studentGroups, setStudentGroups] = useState<StudentGroupResponse[]>(defaultStudentGroups);
  const [classId, setClassId] = useState("");
  const [classSearch, setClassSearch] = useState("");
  const [studentGroupId, setStudentGroupId] = useState("1");
  const [sendMail, setSendMail] = useState(true);

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

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      Promise.all([classApi.list(), userApi.listStudentGroups()])
        .then(([classData, groupData]) => {
          setClasses(classData);
          setStudentGroups(groupData.length ? groupData : defaultStudentGroups);
        })
        .catch((err) => setMessage(err instanceof Error ? err.message : "Không tải được danh sách lớp."));
    }, 0);

    return () => window.clearTimeout(timerId);
  }, []);

  const updateField = (field: keyof UserProfilePayload, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setLoading(true);

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
      await userApi.create(payload, { sendMail });
      setMessage(sendMail
        ? "Đã tạo hồ sơ sinh viên. Thông tin tài khoản đăng nhập sẽ được gửi về email sinh viên nếu cấu hình mail đang bật."
        : "Đã tạo hồ sơ sinh viên và tài khoản đăng nhập. Hệ thống đã bỏ qua gửi email theo tùy chọn.");
      setTimeout(() => navigate("/admin/students"), 700);
    } catch (err) {
      setMessage(getZodMessage(err, err instanceof Error ? err.message : "Không tạo được sinh viên."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <BackButton to="/admin/students">Quay lại danh sách</BackButton>

      <PageHeader
        title="Thêm sinh viên thủ công"
        subtitle="Tạo hồ sơ sinh viên mới kèm tài khoản đăng nhập ban đầu."
      />
      <Card>
        {message && <div className="mb-5 rounded-lg bg-surface-container-low px-4 py-3 font-semibold text-primary">{message}</div>}
        <form className="grid gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
          <FormField
            label="MSSV"
            onChange={(event) => updateField("studentId", event.target.value)}
            placeholder="VD: 20210001"
            required
            value={formData.studentId}
          />
          <FormField
            label="Họ tên"
            onChange={(event) => updateField("fullName", event.target.value)}
            placeholder="Nguyễn Văn A"
            required
            value={formData.fullName}
          />
          <FormField
            label="Email sinh viên"
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="mssv@student.edu.vn"
            required
            type="email"
            value={formData.email}
          />
          <FormField
            label="Ngày sinh"
            onChange={(event) => updateField("dob", event.target.value)}
            type="date"
            value={formData.dob}
          />
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
          <FormField
            label="Số điện thoại"
            onChange={(event) => updateField("contactPhone", event.target.value)}
            placeholder="090..."
            value={formData.contactPhone}
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">Trạng thái sinh viên</span>
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
          <label className="flex items-start gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 md:col-span-2">
            <input
              checked={sendMail}
              className="mt-1 h-4 w-4 accent-primary"
              disabled={loading}
              onChange={(event) => setSendMail(event.target.checked)}
              type="checkbox"
            />
            <span>
              <span className="block font-bold text-on-surface">Gửi email tài khoản cho sinh viên sau khi tạo</span>
              <span className="mt-1 block text-sm leading-6 text-on-surface-variant">
                Bỏ chọn khi đang test để tránh gửi mail thật. Nếu bỏ chọn, tài khoản vẫn được tạo với mật khẩu tạm ngẫu nhiên nhưng sinh viên sẽ không nhận thông tin đăng nhập qua email.
              </span>
            </span>
          </label>
          <div className="md:col-span-2">
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              <Save className="h-5 w-5" />
              {loading ? "Đang lưu..." : "Lưu sinh viên"}
            </button>
          </div>
        </form>
      </Card>
    </>
  );
}

export default StudentCreatePage;
