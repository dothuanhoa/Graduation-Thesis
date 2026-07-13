import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Card from "../../../components/Card";
import PageHeader from "../../../components/PageHeader";
import { examApi, type AttemptResponse } from "../../../services/api";

const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString("vi-VN") : "N/A");

const attemptLabel: Record<string, string> = {
  NOT_STARTED: "Chưa bắt đầu",
  IN_PROGRESS: "Đang làm",
  SUBMITTED: "Đã nộp",
  LOCKED: "Bị khóa",
};

function AdminExamResultsPage() {
  const [attempts, setAttempts] = useState<AttemptResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      setAttempts(await examApi.listAttempts());
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không tải được kết quả kỳ thi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submitted = attempts.filter((attempt) => attempt.status === "SUBMITTED");
  const average = submitted.length ? submitted.reduce((sum, attempt) => sum + (attempt.score || 0), 0) / submitted.length : 0;

  return (
    <div className="space-y-gutter">
      <PageHeader title="Kết quả kỳ thi" subtitle="Theo dõi điểm số, lượt nộp bài và số lần vi phạm của sinh viên." />
      <div className="flex flex-wrap gap-3">
        <button className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" onClick={load} type="button">
          <RefreshCw className="h-5 w-5" />
          Tải lại
        </button>
      </div>
      {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">{message}</div>}
      <div className="grid gap-gutter md:grid-cols-3">
        <Card>
          <p className="text-sm text-on-surface-variant">Tổng lượt thi</p>
          <p className="mt-2 text-3xl font-bold text-on-surface">{attempts.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-on-surface-variant">Đã nộp</p>
          <p className="mt-2 text-3xl font-bold text-on-surface">{submitted.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-on-surface-variant">Điểm trung bình</p>
          <p className="mt-2 text-3xl font-bold text-on-surface">{Math.round(average * 100) / 100}</p>
        </Card>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-4 py-3">Kỳ thi</th>
                <th className="px-4 py-3">Sinh viên</th>
                <th className="px-4 py-3">Điểm</th>
                <th className="px-4 py-3">Đúng/Tổng</th>
                <th className="px-4 py-3">Vi phạm</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Nộp lúc</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((attempt) => (
                <tr key={attempt.id} className="border-t border-outline-variant">
                  <td className="px-4 py-3 font-semibold text-on-surface">{attempt.examTitle}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{attempt.userTsid}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{attempt.score ?? "N/A"}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{attempt.correctCount ?? 0}/{attempt.totalQuestions ?? 0}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{attempt.violationCount}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{attemptLabel[attempt.status] || attempt.status}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{formatDateTime(attempt.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && attempts.length === 0 && <p className="border-t border-outline-variant px-4 py-8 text-center text-sm text-on-surface-variant">Chưa có kết quả kỳ thi.</p>}
          {loading && <p className="border-t border-outline-variant px-4 py-8 text-center text-sm text-on-surface-variant">Đang tải kết quả...</p>}
        </div>
      </Card>
    </div>
  );
}

export default AdminExamResultsPage;
