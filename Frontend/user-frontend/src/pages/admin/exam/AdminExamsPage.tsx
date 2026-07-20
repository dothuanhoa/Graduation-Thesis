import { CalendarClock, Edit3, Eye, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import BackButton from "../../../components/BackButton";
import Card from "../../../components/Card";
import DataTable, { type Column } from "../../../components/DataTable";
import FilterBar from "../../../components/FilterBar";
import FormField from "../../../components/FormField";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import type { StatusType, TableRow } from "../../../data/mockData";
import {
  classApi,
  examApi,
  facultyApi,
  userApi,
  type ClassResponse,
  type ExamPayload,
  type ExamResponse,
  type ExamStatus,
  type ExamTargetPayload,
  type FacultyResponse,
  type StudentGroupResponse,
  type UserProfile,
} from "../../../services/api";
import { formatVietnamDateTime, toApiLocalDateTime, toDateTimeLocalInput } from "../../../utils/dateTime";
import { includesSearch } from "../../../utils/search";
import { defaultStudentGroups, studentGroupName } from "../../../utils/studentGroups";
import ExamTargetEditor from "./ExamTargetEditor";
import { createEmptyExamTarget } from "./examTargetUtils";

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
  targets: [createEmptyExamTarget()],
  status: "INACTIVE",
};

const toDateTimeLocal = toDateTimeLocalInput;
const toApiDateTime = toApiLocalDateTime;
const formatDateTime = (value?: string) => formatVietnamDateTime(value);

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

const targetSummary = (exam: ExamResponse) => {
  const targets = exam.targets || [];
  if (targets.length > 1) {
    return `${targets.length} khung giờ`;
  }

  const target = targets[0];
  if (!target) {
    return exam.targetGroupName || studentGroupName(exam.targetGroupCode);
  }

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

const toRow = (exam: ExamResponse): ExamRow => ({
  id: exam.id,
  title: exam.title,
  window: `${formatDateTime(exam.startTime)} - ${formatDateTime(exam.endTime)}`,
  duration: `${exam.durationMins} phút`,
  questions: `${exam.availableQuestionCount ?? 0}/${exam.questionCount}`,
  targetGroup: targetSummary(exam),
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

const minDateTime = (values: string[]) => values.filter(Boolean).sort()[0] || "";
const maxDateTime = (values: string[]) => {
  const sorted = values.filter(Boolean).sort();
  return sorted[sorted.length - 1] || "";
};

function AdminExamsPage() {
  const [exams, setExams] = useState<ExamResponse[]>([]);
  const [form, setForm] = useState<ExamPayload>(emptyForm);
  const [classes, setClasses] = useState<ClassResponse[]>([]);
  const [faculties, setFaculties] = useState<FacultyResponse[]>([]);
  const [studentGroups, setStudentGroups] = useState<StudentGroupResponse[]>(defaultStudentGroups);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [editingId, setEditingId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [keyword, setKeyword] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

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
    const timeoutId = window.setTimeout(() => {
      void loadExams();
      void loadReferences();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadExams, loadReferences]);

  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const targetText = targetSummary(exam);
      const matchesKeyword = includesSearch(`${exam.title} ${exam.description ?? ""} ${targetText}`, keyword);
      const matchesGroup = !groupFilter || exam.targetGroupCode === groupFilter || exam.targets?.some((target) => target.targetGroupCode === groupFilter);
      const matchesStatus = !statusFilter || exam.status === statusFilter;
      return matchesKeyword && matchesGroup && matchesStatus;
    });
  }, [exams, groupFilter, keyword, statusFilter]);

  const rows = useMemo(() => filteredExams.map(toRow), [filteredExams]);

  const resetForm = () => {
    setEditingId("");
    setForm({ ...emptyForm, targets: [createEmptyExamTarget()] });
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const toggleCreateForm = () => {
    if (showForm) {
      resetForm();
      setShowForm(false);
      return;
    }
    openCreateForm();
  };

  const editExam = (exam: ExamResponse) => {
    const targets = normalizeExamTargets(exam);
    setEditingId(exam.id);
    setForm({
      title: exam.title,
      description: exam.description || "",
      startTime: toDateTimeLocal(exam.startTime),
      endTime: toDateTimeLocal(exam.endTime),
      durationMins: exam.durationMins,
      questionCount: exam.questionCount,
      targetGroupCode: exam.targetGroupCode || "1",
      targets,
      status: exam.status,
    });
    setShowForm(true);
  };

  const buildPayload = () => {
    const targets = (form.targets?.length ? form.targets : [createEmptyExamTarget()]).map((target) => {
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

    const startTime = minDateTime(targets.map((target) => target.startTime));
    const endTime = maxDateTime(targets.map((target) => target.endTime));

    return {
      ...form,
      startTime,
      endTime,
      durationMins: Number(form.durationMins),
      questionCount: Number(form.questionCount),
      targetGroupCode: targets[0]?.targetGroupCode || "1",
      targets,
    };
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const payload = buildPayload();
    try {
      if (editingId) {
        await examApi.update(editingId, payload);
        setMessage("Đã cập nhật kỳ thi.");
      } else {
        await examApi.create(payload);
        setMessage("Đã tạo kỳ thi.");
      }
      resetForm();
      setShowForm(false);
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
        subtitle="Tạo kỳ thi, cấu hình đối tượng, khung giờ, thời lượng và trạng thái mở thi."
      />

      <div className="flex flex-wrap gap-3">
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary" onClick={toggleCreateForm} type="button">
          {showForm ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          {showForm ? "Ẩn form tạo" : "Tạo kỳ thi"}
        </button>
        <button className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" onClick={loadExams} type="button">
          <RefreshCw className="h-5 w-5" />
          Tải lại
        </button>
      </div>

      {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">{message}</div>}

      <FilterBar
        filters={[
          {
            id: "group",
            label: "Nhóm thi",
            value: groupFilter,
            onChange: setGroupFilter,
            options: [
              { value: "", label: "Tất cả nhóm" },
              ...defaultStudentGroups
                .filter((group): group is { code: string; name: string } => Boolean(group.code && group.name))
                .map((group) => ({ value: group.code, label: group.name })),
            ],
          },
          {
            id: "status",
            label: "Trạng thái",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "", label: "Tất cả trạng thái" },
              { value: "ACTIVE", label: "Hoạt động" },
              { value: "INACTIVE", label: "Ngưng" },
            ],
          },
        ]}
        onReset={() => {
          setKeyword("");
          setGroupFilter("");
          setStatusFilter("");
        }}
        onSearchChange={setKeyword}
        resultText={`Hiển thị ${filteredExams.length} / ${exams.length} kỳ thi`}
        searchPlaceholder="Nhập tên kỳ thi, mô tả hoặc đối tượng"
        searchValue={keyword}
        title="Lọc danh sách kỳ thi"
      />

      {showForm && (
        <Card>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-primary">{editingId ? "Chỉnh sửa kỳ thi" : "Kỳ thi mới"}</p>
              <h2 className="mt-1 text-2xl font-bold text-on-surface">{editingId ? "Cập nhật cấu hình" : "Tạo kỳ thi"}</h2>
            </div>
            <BackButton
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
            >Quay lại danh sách</BackButton>
          </div>

          <form className="grid gap-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 lg:grid-cols-2">
              <FormField label="Tên kỳ thi" onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required value={form.title} />
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Thời lượng (phút)" min={1} onChange={(event) => setForm((current) => ({ ...current, durationMins: Number(event.target.value) }))} required type="number" value={form.durationMins} />
                <FormField label="Số câu bốc" min={1} onChange={(event) => setForm((current) => ({ ...current, questionCount: Number(event.target.value) }))} required type="number" value={form.questionCount} />
              </div>
              <FormField as="textarea" className="min-h-28" label="Mô tả / hướng dẫn ngắn" onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} value={form.description || ""} />
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-on-surface">Trạng thái</span>
                <select className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm focus-ring" onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ExamStatus }))} value={form.status}>
                  <option value="INACTIVE">Ngưng</option>
                  <option value="ACTIVE">Hoạt động</option>
                </select>
              </label>
            </div>

            <ExamTargetEditor
              classes={classes}
              faculties={faculties}
              onChange={(targets) => setForm((current) => ({ ...current, targets }))}
              studentGroups={studentGroups}
              students={students}
              targets={form.targets || []}
            />

            <div className="flex flex-wrap gap-3">
              <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary disabled:opacity-60" disabled={saving} type="submit">
                <CalendarClock className="h-5 w-5" />
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
      )}

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
          selectable={false}
        />
      )}
    </div>
  );
}

export default AdminExamsPage;
