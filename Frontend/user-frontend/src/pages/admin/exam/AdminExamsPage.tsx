import { Edit3, Eye, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Card from "../../../components/Card";
import DataTable, { type Column } from "../../../components/DataTable";
import FormField from "../../../components/FormField";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import type { StatusType, TableRow } from "../../../data/mockData";
import { examApi, type ExamPayload, type ExamResponse, type ExamStatus } from "../../../services/api";
import { defaultStudentGroups, studentGroupName } from "../../../utils/studentGroups";

type ExamRow = TableRow & {
  id: string;
  title: string;
  window: string;
  duration: string;
  questions: string;
  targetGroup: string;
  status: StatusType;
};

const emptyForm: ExamPayload = {
  title: "",
  description: "",
  startTime: "",
  endTime: "",
  durationMins: 30,
  questionCount: 30,
  targetGroupCode: "1",
  status: "INACTIVE",
};

const toDateTimeLocal = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const toApiDateTime = (value: string) => (value ? (value.length === 16 ? `${value}:00` : value) : "");

const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString("vi-VN") : "N/A");

const toRow = (exam: ExamResponse): ExamRow => ({
  id: exam.id,
  title: exam.title,
  window: `${formatDateTime(exam.startTime)} - ${formatDateTime(exam.endTime)}`,
  duration: `${exam.durationMins} phút`,
  questions: `${exam.availableQuestionCount ?? 0}/${exam.questionCount}`,
  targetGroup: exam.targetGroupName || studentGroupName(exam.targetGroupCode),
  status: exam.status,
});

const columns: Column<ExamRow>[] = [
  { header: "Tên kỳ thi", key: "title" },
  { header: "Khung giờ", key: "window" },
  { header: "Thời lượng", key: "duration" },
  { header: "Câu hỏi", key: "questions" },
  { header: "Đối tượng", key: "targetGroup" },
  { header: "Trạng thái", key: "status", render: (row) => <StatusBadge status={row.status} /> },
];

function AdminExamsPage() {
  const [exams, setExams] = useState<ExamResponse[]>([]);
  const [form, setForm] = useState<ExamPayload>(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadExams = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      setExams(await examApi.list());
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không tải được danh sách kỳ thi.");
      setExams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadExams();
  }, [loadExams]);

  const rows = useMemo(() => exams.map(toRow), [exams]);

  const resetForm = () => {
    setEditingId("");
    setForm(emptyForm);
  };

  const editExam = (exam: ExamResponse) => {
    setEditingId(exam.id);
    setForm({
      title: exam.title,
      description: exam.description || "",
      startTime: toDateTimeLocal(exam.startTime),
      endTime: toDateTimeLocal(exam.endTime),
      durationMins: exam.durationMins,
      questionCount: exam.questionCount,
      targetGroupCode: exam.targetGroupCode || "1",
      status: exam.status,
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const payload = {
      ...form,
      startTime: toApiDateTime(form.startTime),
      endTime: toApiDateTime(form.endTime),
      durationMins: Number(form.durationMins),
      questionCount: Number(form.questionCount),
    };
    try {
      if (editingId) {
        await examApi.update(editingId, payload);
        setMessage("Đã cập nhật kỳ thi.");
      } else {
        await examApi.create(payload);
        setMessage("Đã tạo kỳ thi.");
      }
      resetForm();
      await loadExams();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không lưu được kỳ thi.");
    } finally {
      setSaving(false);
    }
  };

  const removeExam = async (row: ExamRow) => {
    if (!window.confirm(`Xóa hoặc ngưng kỳ thi "${row.title}"?`)) return;
    try {
      await examApi.remove(row.id);
      await loadExams();
      setMessage("Đã xóa/ngưng kỳ thi.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không xóa được kỳ thi.");
    }
  };

  const toggleStatus = async (row: ExamRow) => {
    const nextStatus: ExamStatus = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await examApi.updateStatus(row.id, nextStatus);
      await loadExams();
      setMessage(nextStatus === "ACTIVE" ? "Đã mở kỳ thi." : "Đã ngưng kỳ thi.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không đổi được trạng thái kỳ thi.");
    }
  };

  return (
    <div className="space-y-gutter">
      <PageHeader
        title="Quản lý kỳ thi"
        subtitle="Tạo kỳ thi, cấu hình khung giờ, thời lượng, số câu hỏi bốc đề và trạng thái mở thi."
      />

      {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">{message}</div>}

      <div className="grid gap-gutter xl:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          <button className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" onClick={loadExams} type="button">
            <RefreshCw className="h-5 w-5" />
            Tải lại
          </button>

          {loading ? (
            <div className="panel p-6 text-on-surface-variant">Đang tải danh sách kỳ thi...</div>
          ) : (
            <DataTable
              actions={(row) => (
                <div className="flex flex-wrap justify-end gap-2">
                  <Link className="rounded-lg border border-outline-variant px-3 py-2 text-sm font-semibold text-primary" to={`/admin/exams/${row.id}`}>
                    <Eye className="mr-1 inline h-4 w-4" />
                    Chi tiết
                  </Link>
                  <button className="rounded-lg border border-outline-variant px-3 py-2 text-sm font-semibold text-primary" onClick={() => editExam(exams.find((exam) => exam.id === row.id)!)} type="button">
                    <Edit3 className="mr-1 inline h-4 w-4" />
                    Sửa
                  </button>
                  <button className="rounded-lg border border-outline-variant px-3 py-2 text-sm font-semibold text-primary" onClick={() => void toggleStatus(row)} type="button">
                    {row.status === "ACTIVE" ? "Ngưng" : "Mở"}
                  </button>
                  <button className="rounded-lg px-3 py-2 text-sm font-semibold text-error hover:bg-error-container" onClick={() => void removeExam(row)} type="button">
                    <Trash2 className="mr-1 inline h-4 w-4" />
                    Xóa
                  </button>
                </div>
              )}
              caption="Danh sách kỳ thi"
              columns={columns}
              rows={rows}
            />
          )}
        </div>

        <Card>
          <h2 className="text-xl font-bold text-on-surface">{editingId ? "Cập nhật kỳ thi" : "Tạo kỳ thi"}</h2>
          <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
            <FormField label="Tên kỳ thi" onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required value={form.title} />
            <FormField as="textarea" label="Mô tả / hướng dẫn ngắn" onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} value={form.description || ""} />
            <FormField label="Giờ mở đề" onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} required type="datetime-local" value={form.startTime} />
            <FormField label="Giờ đóng đề" onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} required type="datetime-local" value={form.endTime} />
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Thời lượng (phút)" min={1} onChange={(event) => setForm((current) => ({ ...current, durationMins: Number(event.target.value) }))} required type="number" value={form.durationMins} />
              <FormField label="Số câu bốc" min={1} onChange={(event) => setForm((current) => ({ ...current, questionCount: Number(event.target.value) }))} required type="number" value={form.questionCount} />
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-on-surface">Đối tượng thi</span>
              <select className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm focus-ring" onChange={(event) => setForm((current) => ({ ...current, targetGroupCode: event.target.value }))} value={form.targetGroupCode}>
                {defaultStudentGroups.map((group) => (
                  <option key={group.code} value={group.code}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-on-surface">Trạng thái</span>
              <select className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm focus-ring" onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ExamStatus }))} value={form.status}>
                <option value="INACTIVE">Ngưng</option>
                <option value="ACTIVE">Hoạt động</option>
              </select>
            </label>
            <div className="flex flex-wrap gap-3">
              <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary disabled:opacity-60" disabled={saving} type="submit">
                <Plus className="h-5 w-5" />
                {saving ? "Đang lưu..." : editingId ? "Lưu cập nhật" : "Tạo kỳ thi"}
              </button>
              {editingId && (
                <button className="rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" onClick={resetForm} type="button">
                  Hủy sửa
                </button>
              )}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default AdminExamsPage;
