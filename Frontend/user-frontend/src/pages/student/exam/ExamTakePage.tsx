import { AlertTriangle, Clock, Flag, Save } from "lucide-react";
import Card from "../../../components/Card";

const answers = [
  "Gửi yêu cầu cập nhật hồ sơ qua hệ thống",
  "Tự ý sửa thông tin trong cơ sở dữ liệu",
  "Bỏ qua vì không ảnh hưởng đến học tập",
  "Nhờ bạn cùng lớp đăng nhập chỉnh hộ",
];

function ExamTakePage() {
  return (
    <div className="space-y-gutter">
      <div className="sticky top-16 z-20 panel flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Kỳ thi Quy chế học vụ</p>
          <h1 className="text-2xl font-bold text-on-surface">Màn hình làm bài thi</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-lg bg-error-container px-3 py-2 font-semibold text-error">
            <Clock className="h-5 w-5" />
            28:45
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 font-semibold text-amber-800">
            <AlertTriangle className="h-5 w-5" />
            0 vi phạm
          </span>
        </div>
      </div>

      <section className="grid gap-gutter lg:grid-cols-[1fr_300px]">
        <Card>
          <p className="text-sm font-semibold text-primary">Câu 1 / 30</p>
          <h2 className="mt-3 text-xl font-bold leading-8 text-on-surface">
            Sinh viên cần thực hiện điều gì khi phát hiện thông tin cá nhân trên hệ thống chưa chính xác?
          </h2>
          <div className="mt-6 space-y-3">
            {answers.map((answer, index) => (
              <label key={answer} className="flex cursor-pointer items-center gap-3 rounded-lg border border-outline-variant p-4 hover:bg-surface-container-low">
                <input className="h-4 w-4 text-primary focus-ring" name="answer" type="radio" />
                <span className="font-semibold text-on-surface">{String.fromCharCode(65 + index)}.</span>
                <span className="text-on-surface-variant">{answer}</span>
              </label>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap justify-between gap-3">
            <button className="rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" type="button">
              Câu trước
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary" type="button">
              <Save className="h-5 w-5" />
              Lưu và tiếp tục
            </button>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-on-surface">Danh sách câu hỏi</h2>
          <div className="mt-5 grid grid-cols-5 gap-2">
            {Array.from({ length: 30 }, (_, index) => (
              <button
                key={index}
                className={`h-10 rounded-lg border font-semibold ${
                  index < 4 ? "bg-primary text-on-primary" : "border-outline-variant text-on-surface-variant"
                }`}
                type="button"
              >
                {index + 1}
              </button>
            ))}
          </div>
          <button className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-error px-4 py-3 font-semibold text-on-primary" type="button">
            <Flag className="h-5 w-5" />
            Nộp bài
          </button>
        </Card>
      </section>
    </div>
  );
}

export default ExamTakePage;
