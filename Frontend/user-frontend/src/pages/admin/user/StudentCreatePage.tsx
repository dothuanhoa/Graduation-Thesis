import { Save } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../../../components/BackButton";
import Card from "../../../components/Card";
import FormField from "../../../components/FormField";
import PageHeader from "../../../components/PageHeader";
import { classApi, userApi, type ClassResponse, type StudentGroupResponse, type UserProfilePayload } from "../../../services/api";
import { defaultStudentGroups } from "../../../utils/studentGroups";
import { getZodMessage, userProfileSchema } from "../../../validation/userSchemas";

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
  const [studentGroupId, setStudentGroupId] = useState("1");

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
      const validated = userProfileSchema.parse(formData);
      const payload: UserProfilePayload = {
        ...validated,
        clazz: classId ? { id: classId } : undefined,
        studentGroup: studentGroupId ? { id: Number(studentGroupId) } : undefined,
      };
      await userApi.create(payload);
      setMessage("Đã tạo hồ sơ sinh viên. Thông tin tài khoản đăng nhập sẽ được gửi về email sinh viên.");
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
          <FormField
            as="select"
            label="Giới tính"
            onChange={(event) => updateField("gender", event.target.value)}
            options={["MALE", "FEMALE", "OTHER"]}
            value={formData.gender}
          />
          <FormField
            label="Số điện thoại"
            onChange={(event) => updateField("contactPhone", event.target.value)}
            placeholder="090..."
            value={formData.contactPhone}
          />
          <FormField
            as="select"
            label="Trạng thái sinh viên"
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
