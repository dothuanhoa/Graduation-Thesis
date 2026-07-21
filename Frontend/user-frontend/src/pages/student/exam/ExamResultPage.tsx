import { CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import BackButton from "../../../components/BackButton";
import Card from "../../../components/Card";
import PageHeader from "../../../components/PageHeader";
import { examApi, type AttemptResponse } from "../../../services/api";
import { formatVietnamDateTime } from "../../../utils/dateTime";

const formatDateTime = (value?: string) => formatVietnamDateTime(value);

const statusLabel: Record<string, string> = {
  NOT_STARTED: "Chưa bắt đầu",
  IN_PROGRESS: "Đang làm",
  SUBMITTED: "Đã nộp",
  LOCKED: "Bị khóa",
};

function ExamResultPage() {
  const { id = "" } = useParams();
  const [result, setResult] = useState<AttemptResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setMessage("");
    try {
      setResult(await examApi.result(id));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không tải được kết quả kỳ thi.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  return (
    <div className="space-y-gutter">
      <BackButton to="/student/exams">Quay lại danh sách kỳ thi</BackButton>

      <PageHeader title="Kết quả kỳ thi" subtitle="Xem điểm số, số câu đúng và các vi phạm đã được hệ thống ghi nhận." />

      {loading ? (
        <div className="panel p-6 text-on-surface-variant">Đang tải kết quả...</div>
      ) : result ? (
        <div className="grid gap-gutter lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-emerald-100 p-3 text-emerald-700">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase text-primary">{statusLabel[result.status] || result.status}</p>
                <h2 className="mt-1 text-2xl font-bold text-on-surface">{result.examTitle}</h2>
                <p className="mt-2 text-on-surface-variant">Kết quả đã được lưu vào hệ thống Phòng CTSV.</p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-surface-container-low p-5">
                <p className="text-sm text-on-surface-variant">Điểm</p>
                <p className="mt-2 text-4xl font-bold text-primary">{result.score ?? "N/A"}</p>
              </div>
              <div className="rounded-xl bg-surface-container-low p-5">
                <p className="text-sm text-on-surface-variant">Số câu đúng</p>
                <p className="mt-2 text-4xl font-bold text-on-surface">{result.correctCount ?? 0}/{result.totalQuestions ?? 0}</p>
              </div>
              <div className="rounded-xl bg-surface-container-low p-5">
                <p className="text-sm text-on-surface-variant">Vi phạm</p>
                <p className="mt-2 text-4xl font-bold text-error">{result.violationCount}</p>
              </div>
            </div>

            {result.lockedReason && (
              <div className="mt-6 rounded-xl bg-error-container p-4 text-sm font-semibold text-error">
                {result.lockedReason}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-on-surface">Thông tin lượt thi</h2>
            <div className="mt-5 space-y-4 text-sm text-on-surface-variant">
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Bắt đầu: {formatDateTime(result.startedAt)}
              </p>
              <p>Nộp bài: {formatDateTime(result.submittedAt)}</p>
              <p>Trạng thái: {statusLabel[result.status] || result.status}</p>
              <p className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                Hệ thống ghi nhận {result.violationCount} lần rời màn hình.
              </p>
            </div>
          </Card>
        </div>
      ) : (
        <div className="panel p-6 text-on-surface-variant">{message || "Không có kết quả kỳ thi."}</div>
      )}
    </div>
  );
}

export default ExamResultPage;
