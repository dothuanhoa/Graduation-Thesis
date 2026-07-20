import { CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, XCircle } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import BackButton from "../../../components/BackButton";
import Card from "../../../components/Card";
import PageHeader from "../../../components/PageHeader";
import { userApi, type StudentImportJobStatus } from "../../../services/api";
import { excelImportSchema, getYupMessage } from "../../../validation/userSchemas";

const runningStatuses: StudentImportJobStatus["status"][] = ["QUEUED", "PROCESSING"];
const IMPORT_TEMPLATE_FILENAME = "mau-import-sinh-vien.xlsx";

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

function StudentImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [job, setJob] = useState<StudentImportJobStatus | null>(null);
  const [sendMail, setSendMail] = useState(false);

  const isRunning = Boolean(job && runningStatuses.includes(job.status));
  const progressPercent = uploading ? 8 : Math.max(0, Math.min(100, job?.progressPercent ?? 0));
  const statusText = uploading ? "Đang tải file lên và đọc dữ liệu Excel..." : job?.message || "Chưa bắt đầu import.";

  const summaryItems = useMemo(
    () => [
      { label: "Tổng dòng", value: job?.totalRows ?? 0 },
      { label: "Đã xử lý", value: job?.processedRows ?? 0 },
      { label: "Tạo mới", value: job?.createdStudents ?? 0 },
      { label: "Cập nhật", value: job?.updatedStudents ?? 0 },
      { label: "Bỏ qua", value: job?.skippedStudents ?? 0 },
      { label: "Tài khoản", value: job?.authTotal ? `${job.authProcessed}/${job.authTotal}` : "0/0" },
      { label: "Gửi mail", value: sendMail ? "Có" : "Không" },
    ],
    [job, sendMail],
  );

  useEffect(() => {
    if (!job?.jobId || !runningStatuses.includes(job.status)) return;

    let disposed = false;
    const pollJob = async () => {
      try {
        const latestJob = await userApi.getImportJob(job.jobId);
        if (disposed) return;

        setJob(latestJob);
        if (latestJob.status === "COMPLETED") {
          setMessage(latestJob.message || "Import danh sách sinh viên thành công.");
        }
        if (latestJob.status === "FAILED") {
          setMessage(latestJob.error || latestJob.message || "Import chưa hoàn tất. Vui lòng thử lại.");
        }
      } catch (err) {
        if (!disposed) {
          setMessage(err instanceof Error ? err.message : "Không cập nhật được tiến độ import.");
        }
      }
    };

    void pollJob();
    const intervalId = window.setInterval(() => void pollJob(), 1000);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [job?.jobId, job?.status]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    setUploading(true);
    setJob(null);
    try {
      await excelImportSchema.validate({ file });
      const startedJob = await userApi.startImportJob(file as File, { sendMail });
      setJob(startedJob);
      setMessage(sendMail
        ? "Đã bắt đầu import và gửi email tài khoản. Bạn có thể theo dõi tiến độ bên dưới."
        : "Đã bắt đầu import không gửi email tài khoản. Bạn có thể theo dõi tiến độ bên dưới.");
    } catch (err) {
      setMessage(getYupMessage(err, err instanceof Error ? err.message : "Import thất bại."));
    } finally {
      setUploading(false);
    }
  };

  const handleSelectFile = (selectedFile: File | null) => {
    setFile(selectedFile);
    setMessage("");
    setJob(null);
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    setMessage("");
    try {
      const blob = await userApi.downloadImportTemplate();
      downloadBlob(blob, IMPORT_TEMPLATE_FILENAME);
      setMessage("Đã tải file mẫu Excel.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không tải được file mẫu Excel.");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  return (
    <>
      <BackButton to="/admin/students">Quay lại danh sách</BackButton>

      <PageHeader
        title="Import sinh viên từ Excel"
        subtitle="Nạp file danh sách đầu khóa hoặc giữa/cuối khóa, tự tạo khoa, lớp và niên khóa còn thiếu trước khi lưu hồ sơ sinh viên."
      />

      <Card>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3">
            <div>
              <p className="font-bold text-on-surface">File mẫu import sinh viên</p>
              <p className="mt-1 text-sm text-on-surface-variant">Tải file mẫu có sẵn cột email, ví dụ dữ liệu và từ điển khoa/nhóm.</p>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary hover:bg-surface-container disabled:opacity-60"
              disabled={downloadingTemplate}
              onClick={handleDownloadTemplate}
              type="button"
            >
              <Download className="h-5 w-5" />
              {downloadingTemplate ? "Đang tải..." : "Tải file mẫu"}
            </button>
          </div>

          <label
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-lowest px-6 py-10 text-center transition ${
              uploading || isRunning ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:border-primary hover:bg-primary-fixed"
            }`}
          >
            <FileSpreadsheet className="h-12 w-12 text-primary" />
            <span className="mt-4 text-lg font-bold text-on-surface">{file ? file.name : "Chọn file Excel"}</span>
            <span className="mt-2 text-sm text-on-surface-variant">
              Hỗ trợ .xlsx hoặc .xls, đọc cột MSSV, họ tên, email, lớp, khoa, niên khóa và Nhóm (1=Đầu khóa, 2=Giữa khóa, 3=Cuối khóa).
            </span>
            <input
              accept=".xlsx,.xls"
              className="sr-only"
              disabled={uploading || isRunning}
              onChange={(event) => handleSelectFile(event.target.files?.[0] ?? null)}
              type="file"
            />
          </label>

          <label className="flex items-start gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3">
            <input
              checked={sendMail}
              className="mt-1 h-4 w-4 accent-primary"
              disabled={uploading || isRunning}
              onChange={(event) => setSendMail(event.target.checked)}
              type="checkbox"
            />
            <span>
              <span className="block font-bold text-on-surface">Gửi email tài khoản cho sinh viên sau khi import</span>
              <span className="mt-1 block text-sm leading-6 text-on-surface-variant">
                Mặc định đang tắt để test import an toàn, tránh gửi mail hàng loạt. Nếu tắt, tài khoản vẫn được tạo/cập nhật với mật khẩu tạm ngẫu nhiên nhưng sinh viên sẽ không nhận email thông tin đăng nhập.
              </span>
            </span>
          </label>

          {(uploading || job) && (
            <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {job?.status === "COMPLETED" ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  ) : job?.status === "FAILED" ? (
                    <XCircle className="h-6 w-6 text-error" />
                  ) : (
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  )}
                  <div>
                    <p className="font-bold text-on-surface">{statusText}</p>
                    <p className="text-sm text-on-surface-variant">Tiến độ {progressPercent}%</p>
                  </div>
                </div>
                <span className="rounded-full bg-primary-fixed px-3 py-1 text-sm font-semibold text-primary">
                  {job?.status === "COMPLETED" ? "Hoàn tất" : job?.status === "FAILED" ? "Lỗi" : "Đang xử lý"}
                </span>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface-container-high">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                {summaryItems.map((item) => (
                  <div key={item.label} className="rounded-lg bg-surface-container-low px-3 py-2">
                    <p className="text-xs font-semibold uppercase text-on-surface-variant">{item.label}</p>
                    <p className="mt-1 text-lg font-bold text-on-surface">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 font-semibold text-primary">{message}</div>}

          <button
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary disabled:opacity-60"
            disabled={uploading || isRunning}
            type="submit"
          >
            {uploading || isRunning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            {uploading ? "Đang tải file..." : isRunning ? "Đang import..." : "Import danh sách"}
          </button>
        </form>
      </Card>
    </>
  );
}

export default StudentImportPage;
