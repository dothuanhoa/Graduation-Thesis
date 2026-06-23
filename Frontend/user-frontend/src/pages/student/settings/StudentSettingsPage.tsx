import { BellRing, LockKeyhole, Palette } from "lucide-react";
import Card from "../../../components/Card";
import PageHeader from "../../../components/PageHeader";

const settings = [
  { title: "Thông báo qua email", helper: "Nhận thông báo mới và lịch hẹn xử lý đơn", icon: BellRing, enabled: true },
  { title: "Bảo mật tài khoản", helper: "Đổi mật khẩu và kiểm tra trạng thái đăng nhập", icon: LockKeyhole, enabled: true },
  { title: "Giao diện gọn", helper: "Ưu tiên bố cục nhiều thông tin hơn trên desktop", icon: Palette, enabled: false },
];

function StudentSettingsPage() {
  return (
    <div className="space-y-gutter">
      <PageHeader
        title="Cài đặt sinh viên"
        subtitle="Thiết lập tùy chọn nhận thông báo và một số tùy chọn giao diện cho cổng sinh viên."
      />

      <div className="grid gap-gutter lg:grid-cols-3">
        {settings.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title}>
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="rounded-lg bg-primary-fixed p-3 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <button
                  aria-pressed={item.enabled}
                  className={`h-7 w-12 rounded-full p-1 transition ${item.enabled ? "bg-primary" : "bg-outline-variant"}`}
                  type="button"
                >
                  <span className={`block h-5 w-5 rounded-full bg-white transition ${item.enabled ? "translate-x-5" : ""}`} />
                </button>
              </div>
              <h2 className="text-lg font-bold text-on-surface">{item.title}</h2>
              <p className="mt-2 text-sm text-on-surface-variant">{item.helper}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default StudentSettingsPage;
