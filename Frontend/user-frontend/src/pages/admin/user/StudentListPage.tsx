import { CheckCircle2, Download, Filter, RefreshCw, Search, Trash2, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AutocompleteInput, { type AutocompleteOption } from "../../../components/AutocompleteInput";
import Card from "../../../components/Card";
import DataTable, { type Column } from "../../../components/DataTable";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import { useAuth } from "../../../context/useAuth";
import type { StatusType, TableRow } from "../../../data/mockData";
import {
  academicYearApi,
  ApiError,
  classApi,
  userApi,
  type AcademicYearResponse,
  type ClassResponse,
  type StudentGroupResponse,
  type StudentGroupScope,
  type UserProfile,
} from "../../../services/api";
import { sortBySchoolCode } from "../../../utils/schoolCodeSort";
import { defaultStudentGroups, studentGroupName } from "../../../utils/studentGroups";

type StudentRow = TableRow & {
  id: string;
  studentCode: string;
  name: string;
  email: string;
  className: string;
  faculty: string;
  studentGroup: string;
  status: StatusType;
};

type StudentFilterState = {
  keyword: string;
  faculty: string;
  className: string;
  status: string;
};

type BulkMode = "class" | "status" | "group" | null;

type SuggestionInputProps = {
  id: string;
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  onChange: (value: string) => void;
};

const MAX_STUDENTS_PER_CLASS = 120;
const IMPORT_TEMPLATE_FILENAME = "mau-import-sinh-vien.xlsx";

const emptyFilters: StudentFilterState = {
  keyword: "",
  faculty: "",
  className: "",
  status: "",
};

const statusOptions: Array<{ value: StatusType; label: string }> = [
  { value: "STUDYING", label: "Đang học" },
  { value: "RESERVED", label: "Bảo lưu" },
  { value: "SUSPENDED", label: "Đình chỉ" },
  { value: "GRADUATED", label: "Đã tốt nghiệp" },
];

const groupScopeOptions: Array<{ value: StudentGroupScope; label: string; helper: string }> = [
  {
    value: "SELECTED_STUDENTS",
    label: "Sinh viên đã chọn",
    helper: "Tick một hoặc nhiều sinh viên trong bảng.",
  },
  {
    value: "CLASS",
    label: "Theo lớp",
    helper: "Chuyển toàn bộ sinh viên trong một lớp.",
  },
  {
    value: "ACADEMIC_YEAR",
    label: "Theo niên khóa",
    helper: "Chuyển toàn bộ sinh viên thuộc niên khóa.",
  },
];

const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const uniqueSorted = (values: Array<string | undefined>) =>
  Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, "vi"));

const toStudentRow = (profile: UserProfile): StudentRow => ({
  id: profile.id,
  studentCode: profile.studentId,
  name: profile.fullName,
  email: profile.email || `${profile.studentId}@student.edu.vn`,
  className: profile.clazz?.classCode || "Chưa phân lớp",
  faculty: profile.clazz?.faculty?.facultyName || profile.clazz?.faculty?.facultyCode || "Chưa có khoa",
  studentGroup: profile.studentGroup?.name || studentGroupName(profile.studentGroup?.code),
  status: profile.studentStatus || "STUDYING",
});

const columns: Column<StudentRow>[] = [
  { header: "MSSV", key: "studentCode" },
  {
    header: "Họ tên",
    key: "name",
    render: (row) => (
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary">
          {row.name
            .split(" ")
            .slice(-2)
            .map((word) => word[0])
            .join("")}
        </div>
        <span className="font-semibold text-on-surface">{row.name}</span>
      </div>
    ),
  },
  { header: "Email", key: "email" },
  { header: "Lớp", key: "className" },
  { header: "Khoa", key: "faculty" },
  { header: "Nhóm", key: "studentGroup" },
  { header: "Trạng thái", key: "status", render: (row) => <StatusBadge status={row.status} /> },
];

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

function SuggestionInput({ id, label, value, options, placeholder, onChange }: SuggestionInputProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-on-surface">{label}</span>
      <input
        className="h-[46px] w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface placeholder:text-outline focus-ring"
        list={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
      <datalist id={id}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </label>
  );
}

function StudentListPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classes, setClasses] = useState<ClassResponse[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearResponse[]>([]);
  const [studentGroups, setStudentGroups] = useState<StudentGroupResponse[]>(defaultStudentGroups);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState<BulkMode>(null);
  const [filters, setFilters] = useState<StudentFilterState>(emptyFilters);
  const [bulkClassId, setBulkClassId] = useState("");
  const [bulkClassSearch, setBulkClassSearch] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");
  const [groupScope, setGroupScope] = useState<StudentGroupScope>("SELECTED_STUDENTS");
  const [bulkGroupId, setBulkGroupId] = useState("");
  const [groupClassId, setGroupClassId] = useState("");
  const [groupClassSearch, setGroupClassSearch] = useState("");
  const [groupAcademicYearId, setGroupAcademicYearId] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingBulk, setSavingBulk] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [profileData, classData, academicYearData, groupData] = await Promise.all([
        userApi.list(),
        classApi.list(),
        academicYearApi.list(),
        userApi.listStudentGroups(),
      ]);
      const nextStudents = sortBySchoolCode(profileData.map(toStudentRow), (student) => student.studentCode);
      setStudents(nextStudents);
      setClasses(sortBySchoolCode(classData, (clazz) => clazz.classCode));
      setAcademicYears(sortBySchoolCode(academicYearData, (year) => year.yearName));
      setStudentGroups(sortBySchoolCode(groupData.length > 0 ? groupData : defaultStudentGroups, (group) => group.code));
      setSelectedStudentIds((current) => current.filter((id) => nextStudents.some((student) => student.id === id)));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }
      setError(err instanceof Error ? err.message : "Không tải được danh sách sinh viên.");
      setStudents([]);
      setClasses([]);
      setAcademicYears([]);
      setStudentGroups(defaultStudentGroups);
    } finally {
      setLoading(false);
    }
  }, [logout, navigate]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadStudents();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadStudents]);

  const handleDelete = async (row: StudentRow) => {
    if (!window.confirm(`Xóa hồ sơ sinh viên ${row.name}?`)) return;

    try {
      await userApi.remove(row.id);
      setStudents((current) => current.filter((student) => student.id !== row.id));
      setSelectedStudentIds((current) => current.filter((id) => id !== row.id));
      setMessage("Đã xóa sinh viên.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xóa được sinh viên.");
    }
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    setError("");
    setMessage("");

    try {
      const blob = await userApi.downloadImportTemplate();
      downloadBlob(blob, IMPORT_TEMPLATE_FILENAME);
      setMessage("Đã tải file mẫu Excel.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được file mẫu Excel.");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const facultyOptions = useMemo(
    () =>
      uniqueSorted([
        ...students.map((student) => student.faculty),
        ...classes.map((clazz) => clazz.faculty?.facultyName),
        ...classes.map((clazz) => clazz.faculty?.facultyCode),
      ]),
    [classes, students],
  );

  const classOptions = useMemo(() => {
    const facultyKeyword = normalizeSearch(filters.faculty);
    const sourceClasses = facultyKeyword
      ? classes.filter((clazz) =>
          [clazz.faculty?.facultyName || "", clazz.faculty?.facultyCode || ""]
            .map(normalizeSearch)
            .some((value) => value.includes(facultyKeyword)),
        )
      : classes;

    return uniqueSorted([...students.map((student) => student.className), ...sourceClasses.map((clazz) => clazz.classCode)]);
  }, [classes, filters.faculty, students]);

  const classAutocompleteOptions = useMemo<AutocompleteOption[]>(
    () =>
      classes.map((clazz) => ({
        value: clazz.id,
        label: clazz.classCode,
        description: [
          clazz.faculty?.facultyCode,
          clazz.academicYear?.yearName,
          `${clazz.studentCount ?? 0}/${MAX_STUDENTS_PER_CLASS} sinh viên`,
        ]
          .filter(Boolean)
          .join(" · "),
        searchText: `${clazz.id} ${clazz.classCode} ${clazz.faculty?.facultyCode ?? ""} ${clazz.faculty?.facultyName ?? ""} ${clazz.academicYear?.yearName ?? ""}`,
      })),
    [classes],
  );

  const resolveClassByInput = (value: string) => {
    const cleanValue = value.trim().toLowerCase();
    if (!cleanValue) return undefined;
    return classes.find((clazz) =>
      [clazz.id, clazz.classCode, `${clazz.classCode} - ${clazz.faculty?.facultyCode ?? ""}`]
        .map((item) => String(item ?? "").trim().toLowerCase())
        .includes(cleanValue),
    );
  };

  const updateBulkClassSearch = (value: string) => {
    setBulkClassSearch(value);
    setBulkClassId(resolveClassByInput(value)?.id ?? "");
  };

  const updateGroupClassSearch = (value: string) => {
    setGroupClassSearch(value);
    setGroupClassId(resolveClassByInput(value)?.id ?? "");
  };

  const filteredStudents = useMemo(() => {
    const keyword = normalizeSearch(filters.keyword);
    const facultyKeyword = normalizeSearch(filters.faculty);
    const classKeyword = normalizeSearch(filters.className);

    return students.filter((student) => {
      const matchesKeyword =
        !keyword ||
        [student.studentCode, student.name, student.email, student.className, student.faculty, student.studentGroup]
          .map(normalizeSearch)
          .some((value) => value.includes(keyword));
      const matchesFaculty = !facultyKeyword || normalizeSearch(student.faculty).includes(facultyKeyword);
      const matchesClass = !classKeyword || normalizeSearch(student.className).includes(classKeyword);
      const matchesStatus = !filters.status || student.status === filters.status;

      return matchesKeyword && matchesFaculty && matchesClass && matchesStatus;
    });
  }, [filters, students]);

  const selectedClass = useMemo(() => classes.find((clazz) => clazz.id === bulkClassId), [bulkClassId, classes]);
  const selectedGroupClass = useMemo(() => classes.find((clazz) => clazz.id === groupClassId), [groupClassId, classes]);
  const selectedAcademicYear = useMemo(
    () => academicYears.find((academicYear) => academicYear.id === groupAcademicYearId),
    [academicYears, groupAcademicYearId],
  );

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const updateFilter = (field: keyof StudentFilterState, value: string) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
      ...(field === "faculty" ? { className: "" } : {}),
    }));
  };

  const resetFilters = () => {
    setFilters(emptyFilters);
  };

  const clearSelection = () => {
    setSelectedStudentIds([]);
    setBulkClassId("");
    setBulkClassSearch("");
    setBulkStatus("");
    setBulkGroupId("");
    setGroupClassId("");
    setGroupClassSearch("");
    setGroupAcademicYearId("");
    setGroupScope("SELECTED_STUDENTS");
  };

  const cancelBulkMode = () => {
    clearSelection();
    setBulkMode(null);
  };

  const startBulkMode = (mode: Exclude<BulkMode, null>) => {
    if (bulkMode === mode) {
      cancelBulkMode();
      return;
    }

    setBulkMode(mode);
    clearSelection();
    setError("");
    setMessage("");
  };

  const assignSelectedToClass = async () => {
    if (selectedStudentIds.length === 0) {
      setError("Vui lòng chọn ít nhất một sinh viên cần chuyển lớp.");
      return;
    }
    if (!bulkClassId) {
      setError("Vui lòng chọn lớp cần chuyển sinh viên vào.");
      return;
    }

    setSavingBulk(true);
    setError("");
    setMessage("");
    try {
      const selectedCount = selectedStudentIds.length;
      const targetClassCode = selectedClass?.classCode || "lớp đã chọn";
      await userApi.assignStudentsToClass(selectedStudentIds, bulkClassId);
      setMessage(`Đã chuyển ${selectedCount} sinh viên vào lớp ${targetClassCode}.`);
      cancelBulkMode();
      await loadStudents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không chuyển lớp được cho sinh viên đã chọn.");
    } finally {
      setSavingBulk(false);
    }
  };

  const updateSelectedStatus = async () => {
    if (selectedStudentIds.length === 0) {
      setError("Vui lòng chọn ít nhất một sinh viên cần cập nhật trạng thái.");
      return;
    }
    if (!bulkStatus) {
      setError("Vui lòng chọn trạng thái cần cập nhật.");
      return;
    }

    setSavingBulk(true);
    setError("");
    setMessage("");
    try {
      const selectedCount = selectedStudentIds.length;
      await userApi.updateStudentStatuses(selectedStudentIds, bulkStatus as NonNullable<UserProfile["studentStatus"]>);
      setMessage(`Đã cập nhật trạng thái cho ${selectedCount} sinh viên.`);
      cancelBulkMode();
      await loadStudents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không cập nhật trạng thái được cho sinh viên đã chọn.");
    } finally {
      setSavingBulk(false);
    }
  };

  const updateSelectedGroup = async () => {
    if (!bulkGroupId) {
      setError("Vui lòng chọn nhóm sinh viên cần chuyển đến.");
      return;
    }
    if (groupScope === "SELECTED_STUDENTS" && selectedStudentIds.length === 0) {
      setError("Vui lòng tick ít nhất một sinh viên trên bảng.");
      return;
    }
    if (groupScope === "CLASS" && !groupClassId) {
      setError("Vui lòng chọn lớp cần chuyển nhóm.");
      return;
    }
    if (groupScope === "ACADEMIC_YEAR" && !groupAcademicYearId) {
      setError("Vui lòng chọn niên khóa cần chuyển nhóm.");
      return;
    }

    setSavingBulk(true);
    setError("");
    setMessage("");
    try {
      const response = await userApi.updateStudentGroups({
        scope: groupScope,
        studentGroupId: bulkGroupId,
        studentIds: groupScope === "SELECTED_STUDENTS" ? selectedStudentIds : undefined,
        classId: groupScope === "CLASS" ? groupClassId : undefined,
        academicYearId: groupScope === "ACADEMIC_YEAR" ? groupAcademicYearId : undefined,
      });
      setMessage(response.message || "Đã chuyển nhóm sinh viên.");
      cancelBulkMode();
      await loadStudents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không chuyển nhóm được cho sinh viên.");
    } finally {
      setSavingBulk(false);
    }
  };

  const canSubmitGroup =
    Boolean(bulkGroupId) &&
    ((groupScope === "SELECTED_STUDENTS" && selectedStudentIds.length > 0) ||
      (groupScope === "CLASS" && Boolean(groupClassId)) ||
      (groupScope === "ACADEMIC_YEAR" && Boolean(groupAcademicYearId)));

  return (
    <>
      <PageHeader title="Danh sách sinh viên" subtitle="Tìm kiếm, lọc, thêm mới và quản lý hồ sơ sinh viên." />
      <div className="flex flex-wrap gap-3">
        <Link
          className="rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary hover:bg-surface-container"
          to="/admin/students/import"
        >
          Import Excel
        </Link>
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary hover:bg-surface-container disabled:opacity-60"
          disabled={downloadingTemplate}
          onClick={handleDownloadTemplate}
          type="button"
        >
          <Download className="h-5 w-5" />
          {downloadingTemplate ? "Đang tải..." : "Tải file mẫu"}
        </button>
        <Link className="rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary" to="/admin/students/new">
          Thêm sinh viên
        </Link>
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary hover:bg-surface-container"
          onClick={loadStudents}
          type="button"
        >
          <RefreshCw className="h-5 w-5" />
          Tải lại
        </button>
        <button
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-3 font-semibold ${
            bulkMode === "class" ? "bg-primary text-on-primary" : "border border-outline-variant text-primary hover:bg-surface-container"
          }`}
          onClick={() => startBulkMode("class")}
          type="button"
        >
          <Users className="h-5 w-5" />
          Chuyển lớp
        </button>
        <button
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-3 font-semibold ${
            bulkMode === "group" ? "bg-primary text-on-primary" : "border border-outline-variant text-primary hover:bg-surface-container"
          }`}
          onClick={() => startBulkMode("group")}
          type="button"
        >
          <Users className="h-5 w-5" />
          Chuyển nhóm
        </button>
        <button
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-3 font-semibold ${
            bulkMode === "status" ? "bg-primary text-on-primary" : "border border-outline-variant text-primary hover:bg-surface-container"
          }`}
          onClick={() => startBulkMode("status")}
          type="button"
        >
          <CheckCircle2 className="h-5 w-5" />
          Cập nhật trạng thái
        </button>
      </div>

      <Card>
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Tra cứu hồ sơ</p>
            <h2 className="text-xl font-bold text-on-surface">Tìm kiếm sinh viên</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Hiển thị {filteredStudents.length} / {students.length} sinh viên
            </p>
          </div>
          {activeFilterCount > 0 && (
            <button
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-3 text-sm font-semibold text-primary hover:bg-surface-container"
              onClick={resetFilters}
              type="button"
            >
              <X className="h-4 w-4" />
              Xóa lọc
            </button>
          )}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.5fr_0.9fr_0.9fr_0.9fr_auto]">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">Từ khóa</span>
            <span className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant" />
              <input
                className="h-[46px] w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 pl-10 text-sm text-on-surface placeholder:text-outline focus-ring"
                onChange={(event) => updateFilter("keyword", event.target.value)}
                placeholder="Nhập MSSV, họ tên, lớp hoặc khoa"
                value={filters.keyword}
              />
            </span>
          </label>

          <SuggestionInput
            id="faculty-filter-options"
            label="Khoa"
            onChange={(value) => updateFilter("faculty", value)}
            options={facultyOptions}
            placeholder="Nhập hoặc chọn khoa"
            value={filters.faculty}
          />

          <SuggestionInput
            id="class-filter-options"
            label="Lớp"
            onChange={(value) => updateFilter("className", value)}
            options={classOptions}
            placeholder="Nhập hoặc chọn lớp"
            value={filters.className}
          />

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">Trạng thái</span>
            <select
              className="h-[46px] w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface focus-ring"
              onChange={(event) => updateFilter("status", event.target.value)}
              value={filters.status}
            >
              <option value="">Tất cả trạng thái</option>
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button className="inline-flex h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 font-semibold text-on-primary xl:w-auto" type="button">
              <Filter className="h-5 w-5" />
              Lọc
            </button>
          </div>
        </div>
      </Card>

      {bulkMode && (
        <Card>
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary-fixed p-3 text-primary">
                {bulkMode === "status" ? <CheckCircle2 className="h-5 w-5" /> : <Users className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">Thao tác hàng loạt</p>
                <h2 className="text-xl font-bold text-on-surface">
                  {bulkMode === "class"
                    ? "Chuyển nhiều sinh viên vào lớp"
                    : bulkMode === "group"
                      ? "Chuyển nhóm sinh viên"
                      : "Cập nhật trạng thái sinh viên"}
                </h2>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
                  <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-sm font-bold text-on-primary">
                    Đã chọn {selectedStudentIds.length} sinh viên
                  </span>
                  <span>Tick sinh viên cần xử lý rồi chọn thông tin cập nhật.</span>
                </div>
              </div>
            </div>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-3 text-sm font-semibold text-primary hover:bg-surface-container"
              onClick={cancelBulkMode}
              type="button"
            >
              <X className="h-4 w-4" />
              Hủy thao tác
            </button>
          </div>

          {bulkMode === "class" && (
            <div className="grid gap-4 xl:grid-cols-[1fr_auto_auto]">
              <AutocompleteInput
                emptyMessage="Không tìm thấy lớp phù hợp."
                label="Chuyển vào lớp"
                onChange={updateBulkClassSearch}
                onSelect={(option) => {
                  setBulkClassId(option.value);
                  setBulkClassSearch(option.label);
                }}
                options={classAutocompleteOptions}
                placeholder="Nhập mã lớp hoặc cuộn chọn lớp"
                value={bulkClassSearch}
              />
              <div className="flex flex-col justify-end">
                {selectedClass && (
                  <span className="text-xs text-on-surface-variant">
                    Lớp hiện có {selectedClass.studentCount ?? 0}/{MAX_STUDENTS_PER_CLASS} sinh viên.
                  </span>
                )}
              </div>
              <div className="flex items-end">
                <button
                  className="inline-flex h-[46px] items-center justify-center gap-2 rounded-lg bg-primary px-4 font-semibold text-on-primary disabled:opacity-60"
                  disabled={savingBulk || !bulkClassId || selectedStudentIds.length === 0}
                  onClick={assignSelectedToClass}
                  type="button"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  Chuyển lớp
                </button>
              </div>
            </div>
          )}

          {bulkMode === "group" && (
            <div className="space-y-5">
              <div className="grid gap-3 lg:grid-cols-3">
                {groupScopeOptions.map((option) => {
                  const active = groupScope === option.value;
                  return (
                    <button
                      className={`rounded-lg border px-4 py-3 text-left transition ${
                        active ? "border-primary bg-primary-fixed text-primary" : "border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container"
                      }`}
                      key={option.value}
                      onClick={() => {
                        setGroupScope(option.value);
                        setGroupClassId("");
                        setGroupAcademicYearId("");
                      }}
                      type="button"
                    >
                      <span className="font-bold">{option.label}</span>
                      <span className="mt-1 block text-sm text-on-surface-variant">{option.helper}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-start">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-on-surface">Nhóm mới</span>
                  <select
                    className="h-[46px] w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface focus-ring"
                    onChange={(event) => setBulkGroupId(event.target.value)}
                    value={bulkGroupId}
                  >
                    <option value="">Chọn nhóm</option>
                    {studentGroups.map((group) => (
                      <option key={String(group.id ?? group.code)} value={group.id ?? group.code}>
                        {group.name || studentGroupName(group.code)}
                      </option>
                    ))}
                  </select>
                </label>

                {groupScope === "CLASS" && (
                  <div>
                    <AutocompleteInput
                      emptyMessage="Không tìm thấy lớp phù hợp."
                      label="Lớp áp dụng"
                      onChange={updateGroupClassSearch}
                      onSelect={(option) => {
                        setGroupClassId(option.value);
                        setGroupClassSearch(option.label);
                      }}
                      options={classAutocompleteOptions}
                      placeholder="Nhập mã lớp hoặc cuộn chọn lớp"
                      value={groupClassSearch}
                    />
                    {selectedGroupClass && (
                      <span className="text-xs text-on-surface-variant">
                        Sẽ chuyển {selectedGroupClass.studentCount ?? 0} sinh viên trong lớp {selectedGroupClass.classCode}.
                      </span>
                    )}
                  </div>
                )}

                {groupScope === "ACADEMIC_YEAR" && (
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-on-surface">Niên khóa áp dụng</span>
                    <select
                      className="h-[46px] w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface focus-ring"
                      onChange={(event) => setGroupAcademicYearId(event.target.value)}
                      value={groupAcademicYearId}
                    >
                      <option value="">Chọn niên khóa</option>
                      {academicYears.map((academicYear) => (
                        <option key={academicYear.id} value={academicYear.id}>
                          {academicYear.yearName}
                          {academicYear.classCount != null ? ` (${academicYear.classCount} lớp)` : ""}
                        </option>
                      ))}
                    </select>
                    {selectedAcademicYear && (
                      <span className="text-xs text-on-surface-variant">
                        Áp dụng cho sinh viên thuộc niên khóa {selectedAcademicYear.yearName}.
                      </span>
                    )}
                  </label>
                )}

                {groupScope === "SELECTED_STUDENTS" && (
                  <div className="xl:pt-[26px]">
                    <div className="flex min-h-[46px] items-center rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm text-on-surface-variant">
                      Hãy tick sinh viên trong bảng bên dưới. Hệ thống chỉ chuyển nhóm cho sinh viên đã chọn.
                    </div>
                  </div>
                )}

                <div className="flex pt-0 xl:pt-[26px]">
                  <button
                    className="inline-flex h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 font-semibold text-on-primary disabled:opacity-60 xl:w-auto"
                    disabled={savingBulk || !canSubmitGroup}
                    onClick={updateSelectedGroup}
                    type="button"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    Chuyển nhóm
                  </button>
                </div>
              </div>
            </div>
          )}

          {bulkMode === "status" && (
            <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-on-surface">Trạng thái mới</span>
                <select
                  className="h-[46px] w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface focus-ring"
                  onChange={(event) => setBulkStatus(event.target.value)}
                  value={bulkStatus}
                >
                  <option value="">Chọn trạng thái</option>
                  {statusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <button
                  className="inline-flex h-[46px] items-center justify-center gap-2 rounded-lg bg-primary px-4 font-semibold text-on-primary disabled:opacity-60"
                  disabled={savingBulk || !bulkStatus || selectedStudentIds.length === 0}
                  onClick={updateSelectedStatus}
                  type="button"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  Cập nhật
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {message && <div className="rounded-lg border border-primary-fixed bg-primary-fixed px-4 py-3 text-sm font-semibold text-primary">{message}</div>}
      {error && <div className="rounded-lg border border-error-container bg-error-container px-4 py-3 text-sm font-semibold text-error">{error}</div>}
      {loading ? (
        <div className="panel p-6 text-on-surface-variant">Đang tải danh sách sinh viên...</div>
      ) : (
        <DataTable
          actions={(row) => (
            <div className="flex justify-end gap-2">
              <Link className="rounded-lg border border-outline-variant px-3 py-2 text-sm font-semibold text-primary hover:bg-surface-container" to={`/admin/students/${row.id}`}>
                Xem
              </Link>
              <button
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-error hover:bg-error-container"
                onClick={() => handleDelete(row)}
                type="button"
              >
                <Trash2 className="h-4 w-4" />
                Xóa
              </button>
            </div>
          )}
          caption="Danh sách sinh viên"
          columns={columns}
          getRowId={(row) => row.id}
          onSelectedRowIdsChange={setSelectedStudentIds}
          rows={filteredStudents}
          selectable={Boolean(bulkMode)}
          selectedRowIds={selectedStudentIds}
        />
      )}
    </>
  );
}

export default StudentListPage;
