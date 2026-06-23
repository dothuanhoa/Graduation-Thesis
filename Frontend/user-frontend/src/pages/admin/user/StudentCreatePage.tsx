import { Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../../components/Card";
import FormField from "../../../components/FormField";
import PageHeader from "../../../components/PageHeader";
import { userApi, type UserProfilePayload } from "../../../services/api";
import { getZodMessage, userProfileSchema } from "../../../validation/userSchemas";

function StudentCreatePage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<UserProfilePayload>({
    studentId: "",
    fullName: "",
    dob: "",
    gender: "MALE",
    contactPhone: "",
    studentStatus: "STUDYING",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const updateField = (field: keyof UserProfilePayload, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const payload = userProfileSchema.parse(formData);
      await userApi.create(payload);
      setMessage("Đã tạo hồ sơ sinh viên và gửi yêu cầu tạo tài khoản sang auth-service.");
      setTimeout(() => navigate("/admin/students"), 700);
    } catch (err) {
      setMessage(getZodMessage(err, err instanceof Error ? err.message : "Không tạo được sinh viên."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Thêm sinh viên thủ công"
        subtitle="Form này gọi POST /api/users của user-service. Backend sẽ gọi auth-service để tạo tài khoản."
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
