import { Eye, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BackButton from "../../../components/BackButton";
import DataTable, { type Column } from "../../../components/DataTable";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import type { StatusType, TableRow } from "../../../data/mockData";
import { examApi, type ExamResponse } from "../../../services/api";

type Row = TableRow & {
  id: string;
  title: string;
  questions: string;
  window: string;
  status: StatusType;
};

const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString("vi-VN") : "N/A");

const columns: Column<Row>[] = [
  { header: "Kỳ thi", key: "title" },
  { header: "Câu hỏi", key: "questions" },
  { header: "Khung giờ", key: "window" },
  { header: "Trạng thái", key: "status", render: (row) => <StatusBadge status={row.status} /> },
];

function AdminQuestionsPage() {
  const [exams, setExams] = useState<ExamResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      setExams(await examApi.list());
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không tải được danh sách kỳ thi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const rows = useMemo<Row[]>(
    () =>
      exams.map((exam) => ({
        id: exam.id,
        title: exam.title,
        questions: `${exam.availableQuestionCount ?? 0}/${exam.questionCount}`,
        window: `${formatDateTime(exam.startTime)} - ${formatDateTime(exam.endTime)}`,
        status: exam.status,
      })),
    [exams],
  );

  return (
    <div className="space-y-gutter">
      <BackButton to="/admin/exams">Quay lại danh sách kỳ thi</BackButton>

      <PageHeader title="Ngân hàng câu hỏi" subtitle="Chọn một kỳ thi để thêm câu hỏi thủ công hoặc import Excel ngân hàng câu hỏi." />
      <button className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" onClick={load} type="button">
        <RefreshCw className="h-5 w-5" />
        Tải lại
      </button>
      {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">{message}</div>}
      {loading ? (
        <div className="panel p-6 text-on-surface-variant">Đang tải danh sách kỳ thi...</div>
      ) : (
        <DataTable
          actions={(row) => (
            <Link className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm font-semibold text-primary" to={`/admin/exams/${row.id}`}>
              <Eye className="h-4 w-4" />
              Quản lý câu hỏi
            </Link>
          )}
          caption="Kỳ thi có ngân hàng câu hỏi"
          columns={columns}
          rows={rows}
        />
      )}
    </div>
  );
}

export default AdminQuestionsPage;
