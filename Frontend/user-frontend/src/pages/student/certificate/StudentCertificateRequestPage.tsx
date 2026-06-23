import { Send } from "lucide-react";
import { useState, type FormEvent } from "react";
import Card from "../../../components/Card";
import FormField from "../../../components/FormField";
import PageHeader from "../../../components/PageHeader";

function StudentCertificateRequestPage() {
  const [message, setMessage] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("Yêu cầu đã được ghi nhận trên giao diện. Khi certificate-service hoàn thiện, form này sẽ gửi dữ liệu thật.");
  };

  return (
    <div className="space-y-gutter">
      <PageHeader
        title="Tạo yêu cầu giấy xác nhận"
        subtitle="Chọn loại giấy, nhập mục đích sử dụng và thông tin liên hệ để Phòng CTSV xử lý."
      />

      {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">{message}</div>}

      <Card>
        <form className="grid gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
          <FormField as="select" label="Loại giấy" options={["Xác nhận sinh viên", "Vay vốn sinh viên", "Tạm hoãn nghĩa vụ quân sự", "Ưu đãi giáo dục"]} />
          <FormField label="Số điện thoại nhận thông báo" placeholder="090..." required />
          <FormField label="Email nhận kết quả" placeholder="student@student.stu.edu.vn" type="email" />
          <FormField as="select" label="Hình thức nhận" options={["Nhận trực tiếp tại văn phòng", "Nhận bản scan qua email"]} />
          <FormField as="textarea" className="md:col-span-2" label="Mục đích sử dụng" placeholder="Nhập mục đích sử dụng giấy xác nhận..." required />
          <div className="md:col-span-2">
            <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary" type="submit">
              <Send className="h-5 w-5" />
              Gửi yêu cầu
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default StudentCertificateRequestPage;
