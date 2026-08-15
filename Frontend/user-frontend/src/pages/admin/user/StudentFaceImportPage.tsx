import { CheckCircle2, FolderOpen, Images, Loader2, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import Card from "../../../components/Card";
import PageHeader from "../../../components/PageHeader";
import { userApi, type FaceImageImportJobStatus } from "../../../services/api";
import { validateFaceFolder } from "../../../validation/faceImageValidation";

const runningStatuses: FaceImageImportJobStatus["status"][] = ["QUEUED", "PROCESSING"];

function StudentFaceImportPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [folderName, setFolderName] = useState("");
  const [validating, setValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [job, setJob] = useState<FaceImageImportJobStatus | null>(null);
  const [message, setMessage] = useState("");

  const isRunning = Boolean(job && runningStatuses.includes(job.status));
  const isBusy = validating || uploading || isRunning;
  const progressPercent = validating
    ? Math.round(validationProgress * 0.1)
    : uploading
      ? 10 + Math.round(uploadProgress * 0.3)
      : job
        ? 40 + Math.round(Math.max(0, Math.min(100, job.progressPercent)) * 0.6)
        : 0;

  const progressLabel = validating
    ? `Đang kiểm tra thư mục trên trình duyệt (${validationProgress}%)...`
    : uploading
      ? `Đang tải thư mục ảnh lên máy chủ (${uploadProgress}%)...`
      : job?.message || "Chưa bắt đầu nhập ảnh.";

  const resultItems = useMemo(() => job?.items ?? [], [job?.items]);

  useEffect(() => {
    if (!job?.jobId || !runningStatuses.includes(job.status)) return;

    let disposed = false;
    const pollJob = async () => {
      try {
        const latest = await userApi.getFaceImageImportJob(job.jobId);
        if (disposed) return;
        setJob(latest);
        if (latest.status === "COMPLETED") {
          setMessage(latest.message || "Nhập thư mục ảnh đã hoàn tất.");
        } else if (latest.status === "FAILED") {
          setMessage(latest.error || latest.message || "Nhập thư mục ảnh thất bại.");
        }
      } catch (error) {
        if (!disposed) {
          setMessage(error instanceof Error ? error.message : "Không cập nhật được tiến trình nhập ảnh.");
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

  const handleFolderChange = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setJob(null);
    setMessage("");
    setValidationProgress(0);
    setUploadProgress(0);
    const relativePath = selectedFiles[0]?.webkitRelativePath || "";
    setFolderName(relativePath.split("/")[0] || "Thư mục ảnh đã chọn");
  };

  const handleImport = async () => {
    setMessage("");
    setJob(null);
    setValidating(true);
    setValidationProgress(0);
    setUploadProgress(0);
    try {
      const validationError = await validateFaceFolder(files, (processed, total) => {
        setValidationProgress(Math.round((processed / total) * 100));
      });
      if (validationError) {
        setMessage(validationError);
        return;
      }

      setValidating(false);
      setUploading(true);
      const startedJob = await userApi.startFaceImageImportJob(files, setUploadProgress);
      setJob(startedJob);
      setMessage("Đã tải thư mục lên hệ thống. Bạn có thể theo dõi tiến trình xử lý bên dưới.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không nhập được thư mục ảnh khuôn mặt.");
    } finally {
      setValidating(false);
      setUploading(false);
    }
  };

  return (
    <div className="space-y-gutter">
      <BackButton to="/admin/students">Quay lại danh sách sinh viên</BackButton>
      <PageHeader
        title="Nhập ảnh khuôn mặt sinh viên"
        subtitle="Chọn một thư mục ảnh, theo dõi tiến trình phân tích AWS và kết quả của từng MSSV."
      />

      <Card>
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-sm font-semibold text-primary">Ảnh khuôn mặt hàng loạt</p>
            <h2 className="mt-1 text-xl font-bold text-on-surface">Nhập một thư mục ảnh sinh viên</h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Mỗi file phải có tên là MSSV, ví dụ DH52201258.jpg. Hệ thống kiểm tra MSSV trước khi gửi ảnh cho AWS,
              sau đó lưu thành public/faceId/MSSV/MSSV.png.
            </p>
          </div>

          <label className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-lowest px-6 py-10 text-center transition ${isBusy ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-primary hover:bg-primary-fixed"}`}>
            <FolderOpen className="h-12 w-12 text-primary" />
            <span className="mt-4 text-lg font-bold text-on-surface">{folderName || "Chọn thư mục ảnh"}</span>
            <span className="mt-2 text-sm text-on-surface-variant">
              {files.length ? `${files.length} file đã chọn` : "Tối đa 200 ảnh JPG/PNG, mỗi ảnh tối đa 5MB."}
            </span>
            <input
              accept="image/jpeg,image/png"
              className="sr-only"
              disabled={isBusy}
              multiple
              onChange={(event) => {
                handleFolderChange(Array.from(event.target.files ?? []));
                event.target.value = "";
              }}
              ref={(input) => input?.setAttribute("webkitdirectory", "")}
              type="file"
            />
          </label>

          {(isBusy || job) && (
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
                    <p className="font-bold text-on-surface">{progressLabel}</p>
                    <p className="text-sm text-on-surface-variant">
                      {job
                        ? `${job.processedFiles}/${job.totalFiles} ảnh đã xử lý · Tiến trình tổng: ${progressPercent}%`
                        : `Tiến trình tổng: ${progressPercent}%`}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-primary-fixed px-3 py-1 text-sm font-semibold text-primary">
                  {job?.status === "COMPLETED" ? "Hoàn tất" : job?.status === "FAILED" ? "Lỗi" : "Đang xử lý"}
                </span>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface-container-high">
                <div
                  className={`h-full rounded-full bg-primary transition-all duration-500 ${uploading ? "animate-pulse" : ""}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                {[
                  { label: "Tổng ảnh", value: job?.totalFiles ?? files.length },
                  { label: "Đã xử lý", value: job?.processedFiles ?? 0 },
                  { label: "Thành công", value: job?.succeeded ?? 0 },
                  { label: "Thất bại", value: job?.failed ?? 0 },
                ].map((item) => (
                  <div className="rounded-lg bg-surface-container-low px-3 py-2" key={item.label}>
                    <p className="text-xs font-semibold uppercase text-on-surface-variant">{item.label}</p>
                    <p className="mt-1 text-lg font-bold text-on-surface">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 font-semibold text-primary">{message}</div>}

          {resultItems.length > 0 && (
            <div className="max-h-96 overflow-auto rounded-lg border border-outline-variant">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="sticky top-0 bg-surface-container-high text-on-surface">
                  <tr>
                    <th className="px-4 py-3">File</th>
                    <th className="px-4 py-3">MSSV</th>
                    <th className="px-4 py-3">Kết quả</th>
                    <th className="px-4 py-3">Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {resultItems.map((item, index) => (
                    <tr className="border-t border-outline-variant" key={`${item.fileName}-${index}`}>
                      <td className="px-4 py-3 font-semibold text-on-surface">{item.fileName}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{item.studentId || "—"}</td>
                      <td className={`px-4 py-3 font-bold ${item.success ? "text-emerald-700" : "text-error"}`}>
                        {item.success ? "Thành công" : "Thất bại"}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">{item.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary disabled:opacity-60"
            disabled={isBusy || files.length === 0}
            onClick={() => void handleImport()}
            type="button"
          >
            {isBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Images className="h-5 w-5" />}
            {isBusy ? "Đang nhập ảnh..." : "Gửi thư mục ảnh"}
          </button>
        </div>
      </Card>
    </div>
  );
}

export default StudentFaceImportPage;
