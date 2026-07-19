import { FileUp, Loader2, Plus, RefreshCw, Save, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import BackButton from "../../../components/BackButton";
import Card from "../../../components/Card";
import FormField from "../../../components/FormField";
import PageHeader from "../../../components/PageHeader";
import {
  classApi,
  examApi,
  facultyApi,
  userApi,
  type AttemptResponse,
  type ClassResponse,
  type ExamPayload,
  type ExamResponse,
  type ExamStatus,
  type ExamTargetPayload,
  type FacultyResponse,
  type QuestionPayload,
  type QuestionResponse,
  type StudentGroupResponse,
  type UserProfile,
} from "../../../services/api";
import { defaultStudentGroups, studentGroupName } from "../../../utils/studentGroups";
import ExamTargetEditor from "./ExamTargetEditor";
import { createEmptyExamTarget } from "./examTargetUtils";

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
  targets: [createEmptyExamTarget()],
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

const normalizeExamTargets = (exam: ExamResponse): ExamTargetPayload[] => {
  if (exam.targets?.length) {
    return exam.targets.map((target) => ({
      ...target,
      targetGroupCode: target.targetGroupCode || "1",
      facultyId: target.facultyId || "",
      facultyCode: target.facultyCode || "",
      facultyName: target.facultyName || "",
      classIds: target.classIds || [],
      classCodes: target.classCodes || [],
      targetMode: target.targetMode || (target.studentIds?.length || target.studentCodes?.length ? "STUDENT" : "CLASS"),
      studentIds: target.studentIds || [],
      studentCodes: target.studentCodes || [],
      studentNames: target.studentNames || [],
      startTime: toDateTimeLocal(target.startTime),
      endTime: toDateTimeLocal(target.endTime),
    }));
  }

  return [{
    ...createEmptyExamTarget(),
    targetGroupCode: exam.targetGroupCode || "1",
    startTime: toDateTimeLocal(exam.startTime),
    endTime: toDateTimeLocal(exam.endTime),
  }];
};

const minDateTime = (values: string[]) => values.filter(Boolean).sort()[0] || "";
const maxDateTime = (values: string[]) => {
  const sorted = values.filter(Boolean).sort();
  return sorted[sorted.length - 1] || "";
};

const examTargetSummary = (exam?: ExamResponse | null) => {
  if (!exam) return "Chưa cấu hình";
  if (exam.targets?.length && exam.targets.length > 1) return `${exam.targets.length} khung giờ`;
  const target = exam.targets?.[0];
  if (!target) return exam.targetGroupName || studentGroupName(exam.targetGroupCode);
  const group = target.targetGroupName || studentGroupName(target.targetGroupCode);
  const faculty = target.facultyName || "Tất cả khoa";
  const mode = target.targetMode || "CLASS";
  const classCount = Math.max(target.classIds?.length || 0, target.classCodes?.length || 0);
  const studentCount = Math.max(target.studentIds?.length || 0, target.studentCodes?.length || 0);
  const classes = classCount ? `${classCount} lớp` : "Chưa chọn lớp";
  const students = studentCount ? `${studentCount} sinh viên` : "Chưa chọn sinh viên";
  if (mode === "STUDENT") return `${group} · ${faculty} · ${students}`;
  if (mode === "BOTH") return `${group} · ${faculty} · ${classes} · ${students}`;
  return `${group} · ${faculty} · ${classes}`;
};

function AdminExamDetailPage() {
  const { id = "" } = useParams();
  const [exam, setExam] = useState<ExamResponse | null>(null);
  const [examForm, setExamForm] = useState<ExamPayload>(emptyExamForm);
  const [classes, setClasses] = useState<ClassResponse[]>([]);
  const [faculties, setFaculties] = useState<FacultyResponse[]>([]);
  const [studentGroups, setStudentGroups] = useState<StudentGroupResponse[]>(defaultStudentGroups);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [questions, setQuestions] = useState<QuestionResponse[]>([]);
  const [attempts, setAttempts] = useState<AttemptResponse[]>([]);
  const [questionForm, setQuestionForm] = useState<QuestionPayload>(emptyQuestionForm);
  const [questionSearch, setQuestionSearch] = useState("");
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
        targets: normalizeExamTargets(examData),
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
    const timeoutId = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  const loadReferences = useCallback(async () => {
    try {
      const [facultyData, classData, groupData] = await Promise.all([
        facultyApi.list(),
        classApi.list(),
        userApi.listStudentGroups(),
      ]);
      const studentData = await userApi.list();
      setFaculties(facultyData);
      setClasses(classData);
      setStudentGroups(groupData.length > 0 ? groupData : defaultStudentGroups);
      setStudents(studentData);
    } catch {
      setStudentGroups(defaultStudentGroups);
      setStudents([]);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadReferences(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadReferences]);

  const resultStats = useMemo(() => {
    const submitted = attempts.filter((attempt) => attempt.status === "SUBMITTED");
    const average = submitted.length
      ? submitted.reduce((sum, attempt) => sum + (attempt.score || 0), 0) / submitted.length
      : 0;
    return { submitted: submitted.length, total: attempts.length, average: Math.round(average * 100) / 100 };
  }, [attempts]);

  const filteredQuestions = useMemo(() => {
    const keyword = questionSearch.trim().toLowerCase();
    if (!keyword) return questions;
    return questions.filter((question) => {
      const optionText = question.options.map((option) => option.content).join(" ");
      return `${question.content} ${optionText}`.toLowerCase().includes(keyword);
    });
  }, [questionSearch, questions]);

  const buildExamPayload = () => {
    const targets = (examForm.targets?.length ? examForm.targets : [createEmptyExamTarget()]).map((target) => {
      const faculty = faculties.find((item) => item.id === target.facultyId || item.facultyCode === target.facultyCode || item.facultyName === target.facultyName);
      const targetMode = target.targetMode || "CLASS";
      const selectedClassKeys = new Set(targetMode === "STUDENT" ? [] : [...(target.classIds || []), ...(target.classCodes || [])]);
      const selectedStudentKeys = new Set(targetMode === "CLASS" ? [] : [...(target.studentIds || []), ...(target.studentCodes || [])]);
      const selectedClasses = classes.filter((item) => selectedClassKeys.has(item.id) || selectedClassKeys.has(item.classCode));
      const outputClassIds = targetMode === "STUDENT" ? [] : selectedClasses.length > 0 ? selectedClasses.map((item) => item.id) : target.classIds || [];
      const outputClassCodes = targetMode === "STUDENT" ? [] : selectedClasses.length > 0 ? selectedClasses.map((item) => item.classCode) : target.classCodes || [];
      const selectedClassIds = new Set(outputClassIds);
      const selectedClassCodes = new Set(outputClassCodes);
      const selectedStudents = students.filter((student) => {
        const directlySelected = selectedStudentKeys.has(student.id) || selectedStudentKeys.has(student.studentId);
        if (targetMode === "STUDENT") return directlySelected;
        const classMatched = Boolean(
          student.clazz && (
            (student.clazz.id && selectedClassIds.has(student.clazz.id))
            || (student.clazz.classCode && selectedClassCodes.has(student.clazz.classCode))
          ),
        );
        return classMatched || (targetMode === "BOTH" && directlySelected);
      });
      const outputStudentIds = selectedStudents.length > 0 ? selectedStudents.map((student) => student.id) : target.studentIds || [];
      const outputStudentCodes = selectedStudents.length > 0 ? selectedStudents.map((student) => student.studentId) : target.studentCodes || [];
      const outputStudentNames = selectedStudents.length > 0 ? selectedStudents.map((student) => student.fullName) : target.studentNames || [];
      return {
        ...target,
        targetMode,
        facultyCode: faculty?.facultyCode || target.facultyCode || "",
        facultyName: faculty?.facultyName || target.facultyName || "",
        classIds: outputClassIds,
        classCodes: outputClassCodes,
        studentIds: outputStudentIds,
        studentCodes: outputStudentCodes,
        studentNames: outputStudentNames,
        startTime: toApiDateTime(target.startTime),
        endTime: toApiDateTime(target.endTime),
      };
    });

    return {
      ...examForm,
      startTime: minDateTime(targets.map((target) => target.startTime)),
      endTime: maxDateTime(targets.map((target) => target.endTime)),
      durationMins: Number(examForm.durationMins),
      questionCount: Number(examForm.questionCount),
      targetGroupCode: targets[0]?.targetGroupCode || "1",
      targets,
    };
  };

  const saveExam = async (event: FormEvent) => {
    event.preventDefault();
    if (!id) return;
    setMessage("");
    try {
      await examApi.update(id, buildExamPayload());
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
      <BackButton to="/admin/exams">Quay lại danh sách kỳ thi</BackButton>

      <PageHeader
        title={exam?.title || "Chi tiết kỳ thi"}
        subtitle="Chỉnh cấu hình kỳ thi, quản lý câu hỏi, import Excel và theo dõi kết quả sinh viên."
      />

      {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">{message}</div>}

      <div className="space-y-gutter">
        <Card>
          <h2 className="text-xl font-bold text-on-surface">Cấu hình kỳ thi</h2>
          <form className="mt-5 grid gap-4" onSubmit={saveExam}>
            <FormField label="Tên kỳ thi" onChange={(event) => setExamForm((current) => ({ ...current, title: event.target.value }))} required value={examForm.title} />
            <FormField as="textarea" label="Mô tả / hướng dẫn" onChange={(event) => setExamForm((current) => ({ ...current, description: event.target.value }))} value={examForm.description || ""} />
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Thời lượng" min={1} onChange={(event) => setExamForm((current) => ({ ...current, durationMins: Number(event.target.value) }))} type="number" value={examForm.durationMins} />
              <FormField label="Số câu bốc" min={1} onChange={(event) => setExamForm((current) => ({ ...current, questionCount: Number(event.target.value) }))} type="number" value={examForm.questionCount} />
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-on-surface">Trạng thái</span>
              <select className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm focus-ring" onChange={(event) => setExamForm((current) => ({ ...current, status: event.target.value as ExamStatus }))} value={examForm.status}>
                <option value="INACTIVE">Ngưng</option>
                <option value="ACTIVE">Hoạt động</option>
              </select>
            </label>
            <ExamTargetEditor
              classes={classes}
              faculties={faculties}
              onChange={(targets) => setExamForm((current) => ({ ...current, targets }))}
              studentGroups={studentGroups}
              students={students}
              targets={examForm.targets || []}
            />
            <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary" type="submit">
              <Save className="h-5 w-5" />
              Lưu cấu hình
            </button>
          </form>
        </Card>

        <div className="grid gap-gutter md:grid-cols-4">
          <Card>
            <p className="text-sm text-on-surface-variant">Câu hỏi khả dụng</p>
            <p className="mt-2 text-3xl font-bold text-on-surface">{exam?.availableQuestionCount ?? questions.length}/{exam?.questionCount}</p>
          </Card>
          <Card>
            <p className="text-sm text-on-surface-variant">Đối tượng thi</p>
            <p className="mt-2 text-xl font-bold text-on-surface">{examTargetSummary(exam)}</p>
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

            <div className="mt-5 flex flex-col gap-3 border-t border-outline-variant pt-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-bold text-on-surface">Danh sách câu hỏi</h3>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Hiển thị {filteredQuestions.length}/{questions.length} câu hỏi.
                </p>
              </div>
              <label className="relative w-full lg:max-w-md">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant" />
                <input
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-3 pl-10 pr-3 text-sm text-on-surface placeholder:text-outline focus-ring"
                  onChange={(event) => setQuestionSearch(event.target.value)}
                  placeholder="Tìm theo nội dung câu hỏi hoặc đáp án"
                  value={questionSearch}
                />
              </label>
            </div>

            <div className="mt-4 max-h-[560px] space-y-3 overflow-y-auto pr-2">
              {filteredQuestions.map((question) => {
                const index = questions.findIndex((item) => item.id === question.id);
                return (
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
                );
              })}
              {questions.length === 0 && <p className="rounded-lg bg-surface-container-low p-4 text-sm text-on-surface-variant">Chưa có câu hỏi nào.</p>}
              {questions.length > 0 && filteredQuestions.length === 0 && <p className="rounded-lg bg-surface-container-low p-4 text-sm text-on-surface-variant">Không tìm thấy câu hỏi phù hợp.</p>}
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
  );
}

export default AdminExamDetailPage;
