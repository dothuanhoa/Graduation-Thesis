import { ArrowLeft, FileUp, Loader2, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import Card from "../../../components/Card";
import FormField from "../../../components/FormField";
import PageHeader from "../../../components/PageHeader";
import { examApi, type AttemptResponse, type ExamPayload, type ExamResponse, type ExamStatus, type QuestionPayload, type QuestionResponse } from "../../../services/api";
import { defaultStudentGroups, studentGroupName } from "../../../utils/studentGroups";

const toDateTimeLocal = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const toApiDateTime = (value: string) => (value ? (value.length === 16 ? `${value}:00` : value) : "");
const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString("vi-VN") : "N/A");

const emptyExamForm: ExamPayload = {
  title: "",
  description: "",
  startTime: "",
  endTime: "",
  durationMins: 30,
  questionCount: 30,
  targetGroupCode: "1",
  status: "INACTIVE",
};

const emptyQuestionForm: QuestionPayload = {
  content: "",
  options: [
    { content: "", correct: true },
    { content: "", correct: false },
    { content: "", correct: false },
    { content: "", correct: false },
  ],
};

const attemptLabel: Record<string, string> = {
  NOT_STARTED: "Chưa bắt đầu",
  IN_PROGRESS: "Đang làm",
  SUBMITTED: "Đã nộp",
  LOCKED: "Bị khóa",
};

function AdminExamDetailPage() {
  const { id = "" } = useParams();
  const [exam, setExam] = useState<ExamResponse | null>(null);
  const [examForm, setExamForm] = useState<ExamPayload>(emptyExamForm);
  const [questions, setQuestions] = useState<QuestionResponse[]>([]);
  const [attempts, setAttempts] = useState<AttemptResponse[]>([]);
  const [questionForm, setQuestionForm] = useState<QuestionPayload>(emptyQuestionForm);
  const [editingQuestionId, setEditingQuestionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [importingQuestions, setImportingQuestions] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState("");

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setMessage("");
    try {
      const [examData, questionData, attemptData] = await Promise.all([
        examApi.get(id),
        examApi.listQuestions(id),
        examApi.listAttempts(id),
      ]);
      setExam(examData);
      setExamForm({
        title: examData.title,
        description: examData.description || "",
        startTime: toDateTimeLocal(examData.startTime),
        endTime: toDateTimeLocal(examData.endTime),
        durationMins: examData.durationMins,
        questionCount: examData.questionCount,
        targetGroupCode: examData.targetGroupCode || "1",
        status: examData.status,
      });
      setQuestions(questionData);
      setAttempts(attemptData);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không tải được chi tiết kỳ thi.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const resultStats = useMemo(() => {
    const submitted = attempts.filter((attempt) => attempt.status === "SUBMITTED");
    const average = submitted.length
      ? submitted.reduce((sum, attempt) => sum + (attempt.score || 0), 0) / submitted.length
      : 0;
    return { submitted: submitted.length, total: attempts.length, average: Math.round(average * 100) / 100 };
  }, [attempts]);

  const saveExam = async (event: FormEvent) => {
    event.preventDefault();
    if (!id) return;
    setMessage("");
    try {
      await examApi.update(id, {
        ...examForm,
        startTime: toApiDateTime(examForm.startTime),
        endTime: toApiDateTime(examForm.endTime),
        durationMins: Number(examForm.durationMins),
        questionCount: Number(examForm.questionCount),
      });
      setMessage("Đã cập nhật cấu hình kỳ thi.");
      await loadData();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không lưu được kỳ thi.");
    }
  };

  const resetQuestionForm = () => {
    setEditingQuestionId("");
    setQuestionForm(emptyQuestionForm);
  };

  const editQuestion = (question: QuestionResponse) => {
    const options = [...question.options];
    while (options.length < 4) {
      options.push({ id: `new-${options.length}`, content: "", correct: false });
    }
    setEditingQuestionId(question.id);
    setQuestionForm({
      content: question.content,
      options: options.slice(0, 4).map((option) => ({ content: option.content, correct: Boolean(option.correct) })),
    });
  };

  const saveQuestion = async (event: FormEvent) => {
    event.preventDefault();
    if (!id) return;
    setMessage("");
    const payload = {
      ...questionForm,
      options: questionForm.options.filter((option) => option.content.trim()),
    };
    try {
      if (editingQuestionId) {
        await examApi.updateQuestion(id, editingQuestionId, payload);
        setMessage("Đã cập nhật câu hỏi.");
      } else {
        await examApi.createQuestion(id, payload);
        setMessage("Đã thêm câu hỏi.");
      }
      resetQuestionForm();
      setQuestions(await examApi.listQuestions(id));
      setExam(await examApi.get(id));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không lưu được câu hỏi.");
    }
  };

  const removeQuestion = async (questionId: string) => {
    if (!id || !window.confirm("Xóa câu hỏi này?")) return;
    try {
      await examApi.removeQuestion(id, questionId);
      setQuestions(await examApi.listQuestions(id));
      setExam(await examApi.get(id));
      setMessage("Đã xóa câu hỏi.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không xóa được câu hỏi.");
    }
  };

  const importQuestions = async (file?: File) => {
    if (!id || !file) return;
    return importQuestionsWithProgress(file);
    /*
    try {
      const result = await examApi.importQuestions(id, file);
      setQuestions(await examApi.listQuestions(id));
      setExam(await examApi.get(id));
      setMessage(`Import xong: ${result.imported} câu, bỏ qua ${result.skipped}${result.errors.length ? `. Lỗi: ${result.errors.slice(0, 3).join("; ")}` : ""}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không import được câu hỏi.");
    }
  };

    */
  };

  const importQuestionsWithProgress = async (file?: File) => {
    if (!id || !file || importingQuestions) return;
    setImportingQuestions(true);
    setImportProgress(12);
    setImportStatus(`Đang tải file "${file.name}" lên hệ thống...`);
    setMessage("");
    try {
      setImportProgress(35);
      setImportStatus("Đang đọc file Excel và lưu ngân hàng câu hỏi...");
      const result = await examApi.importQuestions(id, file);
      setImportProgress(75);
      setImportStatus("Đang làm mới danh sách câu hỏi...");
      const [questionData, examData] = await Promise.all([
        examApi.listQuestions(id),
        examApi.get(id),
      ]);
      setQuestions(questionData);
      setExam(examData);
      setImportProgress(100);
      setImportStatus(`Hoàn tất: đã import ${result.imported} câu, bỏ qua ${result.skipped} dòng.`);
      setMessage(`Import xong: ${result.imported} câu, bỏ qua ${result.skipped}${result.errors.length ? `. Lỗi: ${result.errors.slice(0, 5).join("; ")}` : ""}`);
    } catch (err) {
      setImportProgress(0);
      setImportStatus("");
      setMessage(err instanceof Error ? err.message : "Không import được câu hỏi.");
    } finally {
      setImportingQuestions(false);
    }
  };

  const setCorrectOption = (index: number) => {
    setQuestionForm((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) => ({ ...option, correct: optionIndex === index })),
    }));
  };

  if (loading) {
    return <div className="panel p-6 text-on-surface-variant">Đang tải chi tiết kỳ thi...</div>;
  }

  return (
    <div className="space-y-gutter">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline" to="/admin/exams">
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách kỳ thi
      </Link>

      <PageHeader
        title={exam?.title || "Chi tiết kỳ thi"}
        subtitle="Chỉnh cấu hình kỳ thi, quản lý câu hỏi, import Excel và theo dõi kết quả sinh viên."
      />

      {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">{message}</div>}

      <div className="grid gap-gutter xl:grid-cols-[420px_1fr]">
        <Card>
          <h2 className="text-xl font-bold text-on-surface">Cấu hình kỳ thi</h2>
          <form className="mt-5 grid gap-4" onSubmit={saveExam}>
            <FormField label="Tên kỳ thi" onChange={(event) => setExamForm((current) => ({ ...current, title: event.target.value }))} required value={examForm.title} />
            <FormField as="textarea" label="Mô tả / hướng dẫn" onChange={(event) => setExamForm((current) => ({ ...current, description: event.target.value }))} value={examForm.description || ""} />
            <FormField label="Giờ mở đề" onChange={(event) => setExamForm((current) => ({ ...current, startTime: event.target.value }))} required type="datetime-local" value={examForm.startTime} />
            <FormField label="Giờ đóng đề" onChange={(event) => setExamForm((current) => ({ ...current, endTime: event.target.value }))} required type="datetime-local" value={examForm.endTime} />
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Thời lượng" min={1} onChange={(event) => setExamForm((current) => ({ ...current, durationMins: Number(event.target.value) }))} type="number" value={examForm.durationMins} />
              <FormField label="Số câu bốc" min={1} onChange={(event) => setExamForm((current) => ({ ...current, questionCount: Number(event.target.value) }))} type="number" value={examForm.questionCount} />
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-on-surface">Đối tượng thi</span>
              <select className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm focus-ring" onChange={(event) => setExamForm((current) => ({ ...current, targetGroupCode: event.target.value }))} value={examForm.targetGroupCode}>
                {defaultStudentGroups.map((group) => (
                  <option key={group.code} value={group.code}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-on-surface">Trạng thái</span>
              <select className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm focus-ring" onChange={(event) => setExamForm((current) => ({ ...current, status: event.target.value as ExamStatus }))} value={examForm.status}>
                <option value="INACTIVE">Ngưng</option>
                <option value="ACTIVE">Hoạt động</option>
              </select>
            </label>
            <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary" type="submit">
              <Save className="h-5 w-5" />
              Lưu cấu hình
            </button>
          </form>
        </Card>

        <div className="space-y-gutter">
          <div className="grid gap-gutter md:grid-cols-4">
            <Card>
              <p className="text-sm text-on-surface-variant">Câu hỏi khả dụng</p>
              <p className="mt-2 text-3xl font-bold text-on-surface">{exam?.availableQuestionCount ?? questions.length}/{exam?.questionCount}</p>
            </Card>
            <Card>
              <p className="text-sm text-on-surface-variant">Đối tượng thi</p>
              <p className="mt-2 text-xl font-bold text-on-surface">{exam?.targetGroupName || studentGroupName(exam?.targetGroupCode)}</p>
            </Card>
            <Card>
              <p className="text-sm text-on-surface-variant">Lượt nộp bài</p>
              <p className="mt-2 text-3xl font-bold text-on-surface">{resultStats.submitted}/{resultStats.total}</p>
            </Card>
            <Card>
              <p className="text-sm text-on-surface-variant">Điểm trung bình</p>
              <p className="mt-2 text-3xl font-bold text-on-surface">{resultStats.average}</p>
            </Card>
          </div>

          <Card>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-on-surface">Ngân hàng câu hỏi</h2>
                <p className="mt-1 text-sm text-on-surface-variant">File Excel import: Câu hỏi | A | B | C | D | Đáp án đúng.</p>
              </div>
              <label className={`inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary ${importingQuestions ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
                {importingQuestions ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileUp className="h-5 w-5" />}
                {importingQuestions ? "Đang import..." : "Import Excel"}
                <input
                  className="hidden"
                  disabled={importingQuestions}
                  onChange={(event) => {
                    void importQuestions(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                  type="file"
                  accept=".xlsx,.xls"
                />
              </label>
            </div>

            {(importingQuestions || importStatus) && (
              <div className="mt-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-on-surface">{importStatus}</span>
                  <span className="font-bold text-primary">{importProgress}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-surface-container-high">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
              </div>
            )}

            <form className="mt-5 grid gap-4 rounded-xl border border-outline-variant p-4" onSubmit={saveQuestion}>
              <FormField as="textarea" label={editingQuestionId ? "Sửa nội dung câu hỏi" : "Thêm câu hỏi mới"} onChange={(event) => setQuestionForm((current) => ({ ...current, content: event.target.value }))} required value={questionForm.content} />
              <div className="grid gap-3 md:grid-cols-2">
                {questionForm.options.map((option, index) => (
                  <label key={index} className="flex gap-3 rounded-lg border border-outline-variant p-3">
                    <input checked={option.correct} className="mt-3 h-4 w-4 text-primary focus-ring" name="correctOption" onChange={() => setCorrectOption(index)} type="radio" />
                    <span className="flex-1">
                      <span className="mb-1 block text-sm font-semibold text-on-surface">Đáp án {String.fromCharCode(65 + index)}</span>
                      <input
                        className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm focus-ring"
                        onChange={(event) => setQuestionForm((current) => ({
                          ...current,
                          options: current.options.map((item, itemIndex) => itemIndex === index ? { ...item, content: event.target.value } : item),
                        }))}
                        value={option.content}
                      />
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary" type="submit">
                  <Plus className="h-5 w-5" />
                  {editingQuestionId ? "Lưu câu hỏi" : "Thêm câu hỏi"}
                </button>
                {editingQuestionId && (
                  <button className="rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" onClick={resetQuestionForm} type="button">
                    Hủy sửa
                  </button>
                )}
              </div>
            </form>

            <div className="mt-5 space-y-3">
              {questions.map((question, index) => (
                <div key={question.id} className="rounded-xl border border-outline-variant p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-primary">Câu {index + 1}</p>
                      <p className="mt-1 font-semibold text-on-surface">{question.content}</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="rounded-lg border border-outline-variant px-3 py-2 text-sm font-semibold text-primary" onClick={() => editQuestion(question)} type="button">Sửa</button>
                      <button className="rounded-lg px-3 py-2 text-sm font-semibold text-error hover:bg-error-container" onClick={() => void removeQuestion(question.id)} type="button">
                        <Trash2 className="inline h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {question.options.map((option, optionIndex) => (
                      <div key={option.id} className={`rounded-lg px-3 py-2 text-sm ${option.correct ? "bg-emerald-100 font-semibold text-emerald-800" : "bg-surface-container-low text-on-surface-variant"}`}>
                        {String.fromCharCode(65 + optionIndex)}. {option.content}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {questions.length === 0 && <p className="rounded-lg bg-surface-container-low p-4 text-sm text-on-surface-variant">Chưa có câu hỏi nào.</p>}
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-on-surface">Kết quả sinh viên</h2>
              <button className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm font-semibold text-primary" onClick={loadData} type="button">
                <RefreshCw className="h-4 w-4" />
                Tải lại
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-surface-container-low">
                  <tr>
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
                      <td className="px-4 py-3 font-semibold text-on-surface">{attempt.userTsid}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{attempt.score ?? "N/A"}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{attempt.correctCount ?? 0}/{attempt.totalQuestions ?? 0}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{attempt.violationCount}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{attemptLabel[attempt.status] || attempt.status}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{formatDateTime(attempt.submittedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {attempts.length === 0 && <p className="border-t border-outline-variant px-4 py-6 text-center text-sm text-on-surface-variant">Chưa có lượt thi.</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AdminExamDetailPage;
