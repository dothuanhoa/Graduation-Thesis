import { Mail, PhoneCall, Send } from "lucide-react";
import Card from "../../../components/Card";
import FormField from "../../../components/FormField";
import PageHeader from "../../../components/PageHeader";
import { supportTopics } from "../../../data/studentPortalData";

function StudentSupportPage() {
  return (
    <div className="space-y-gutter">
      <PageHeader
        title="Trung tâm hỗ trợ"
        subtitle="Gửi yêu cầu hỗ trợ về tài khoản, giấy xác nhận, hoạt động ngoại khóa và kỳ thi trực tuyến."
      />

      <div className="grid gap-gutter xl:grid-cols-[1fr_380px]">
        <Card>
          <div className="mb-5">
            <p className="text-sm font-semibold text-primary">Gửi yêu cầu</p>
            <h2 className="text-xl font-bold text-on-surface">Mô tả vấn đề cần hỗ trợ</h2>
          </div>
          <form className="grid gap-5 md:grid-cols-2">
            <FormField as="select" label="Nhóm hỗ trợ" options={["Tài khoản", "Hồ sơ sinh viên", "Giấy xác nhận", "Kỳ thi", "Hoạt động"]} />
            <FormField label="Số điện thoại" placeholder="090..." />
            <FormField className="md:col-span-2" label="Tiêu đề" placeholder="Nhập tiêu đề yêu cầu" />
            <FormField as="textarea" className="md:col-span-2" label="Nội dung" placeholder="Mô tả chi tiết vấn đề..." />
            <div className="md:col-span-2">
              <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary" type="button">
                <Send className="h-5 w-5" />
                Gửi hỗ trợ
              </button>
            </div>
          </form>
        </Card>

        <div className="space-y-gutter">
          <Card>
            <h2 className="text-xl font-bold text-on-surface">Kênh liên hệ</h2>
            <div className="mt-5 space-y-3 text-sm text-on-surface-variant">
              <p className="flex items-center gap-2">
                <PhoneCall className="h-4 w-4 text-primary" />
                028 1234 5678
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                ctsv@stu.edu.vn
              </p>
            </div>
          </Card>
          <Card>
            <h2 className="text-xl font-bold text-on-surface">Chủ đề thường gặp</h2>
            <div className="mt-5 space-y-4">
              {supportTopics.map((topic) => {
                const Icon = topic.icon;
                return (
                  <div key={topic.title} className="flex gap-3">
                    <div className="rounded-lg bg-primary-fixed p-2 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-on-surface">{topic.title}</p>
                      <p className="text-sm text-on-surface-variant">{topic.helper}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default StudentSupportPage;
