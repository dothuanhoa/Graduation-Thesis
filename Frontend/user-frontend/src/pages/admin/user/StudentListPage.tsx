import { Filter, RefreshCw, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../../../components/Card";
import DataTable, { type Column } from "../../../components/DataTable";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import { useAuth } from "../../../context/useAuth";
import type { StatusType, TableRow } from "../../../data/mockData";
import { ApiError, userApi, type UserProfile } from "../../../services/api";

type StudentRow = TableRow & {
  id: string;
  studentCode: string;
  name: string;
  className: string;
  faculty: string;
  status: StatusType;
};

type StudentFilterState = {
  keyword: string;
  faculty: string;
  className: string;
  status: string;
};

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

const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const toStudentRow = (profile: UserProfile): StudentRow => ({
  id: profile.id,
  studentCode: profile.studentId,
  name: profile.fullName,
  className: profile.clazz?.classCode || "Chưa phân lớp",
  faculty: profile.clazz?.faculty?.facultyName || profile.clazz?.faculty?.facultyCode || "Chưa có khoa",
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
  { header: "Lớp", key: "className" },
  { header: "Khoa", key: "faculty" },
  { header: "Trạng thái", key: "status", render: (row) => <StatusBadge status={row.status} /> },
];

function StudentListPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [filters, setFilters] = useState<StudentFilterState>(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await userApi.list();
      setStudents(data.map(toStudentRow));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }
      setError(err instanceof Error ? err.message : "Không tải được danh sách sinh viên.");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [logout, navigate]);

  useEffect(() => {
    let active = true;

    userApi
      .list()
      .then((data) => {
        if (active) setStudents(data.map(toStudentRow));
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) {
          logout();
          navigate("/login", { replace: true });
          return;
        }
        setError(err instanceof Error ? err.message : "Không tải được danh sách sinh viên.");
        setStudents([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [logout, navigate]);

  const handleDelete = async (row: StudentRow) => {
    if (!window.confirm(`Xóa hồ sơ sinh viên ${row.name}?`)) return;

    try {
      await userApi.remove(row.id);
      setStudents((current) => current.filter((student) => student.id !== row.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xóa được sinh viên.");
    }
  };

  const facultyOptions = useMemo(
    () => Array.from(new Set(students.map((student) => student.faculty).filter(Boolean))).sort((a, b) => a.localeCompare(b, "vi")),
    [students],
  );

  const classOptions = useMemo(() => {
    const source = filters.faculty ? students.filter((student) => student.faculty === filters.faculty) : students;
    return Array.from(new Set(source.map((student) => student.className).filter(Boolean))).sort((a, b) => a.localeCompare(b, "vi"));
  }, [filters.faculty, students]);

  const filteredStudents = useMemo(() => {
    const keyword = normalizeSearch(filters.keyword);

    return students.filter((student) => {
      const matchesKeyword =
        !keyword ||
        [student.studentCode, student.name, student.className, student.faculty]
          .map(normalizeSearch)
          .some((value) => value.includes(keyword));
      const matchesFaculty = !filters.faculty || student.faculty === filters.faculty;
      const matchesClass = !filters.className || student.className === filters.className;
      const matchesStatus = !filters.status || student.status === filters.status;

      return matchesKeyword && matchesFaculty && matchesClass && matchesStatus;
    });
  }, [filters, students]);

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

  return (
    <>
      <PageHeader
        title="Danh sách sinh viên"
        subtitle="Tìm kiếm, lọc, thêm mới và quản lý hồ sơ sinh viên."
      />
      <div className="flex flex-wrap gap-3">
        <Link
          className="rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary hover:bg-surface-container"
          to="/admin/students/import"
        >
          Import Excel
        </Link>
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

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">Khoa</span>
            <select
              className="h-[46px] w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface focus-ring"
              onChange={(event) => updateFilter("faculty", event.target.value)}
              value={filters.faculty}
            >
              <option value="">Tất cả khoa</option>
              {facultyOptions.map((faculty) => (
                <option key={faculty} value={faculty}>
                  {faculty}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">Lớp</span>
            <select
              className="h-[46px] w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface focus-ring"
              onChange={(event) => updateFilter("className", event.target.value)}
              value={filters.className}
            >
              <option value="">Tất cả lớp</option>
              {classOptions.map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
          </label>

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
            <button
              className="inline-flex h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 font-semibold text-on-primary xl:w-auto"
              type="button"
            >
              <Filter className="h-5 w-5" />
              Lọc
            </button>
          </div>
        </div>
      </Card>
      {error && (
        <div className="rounded-lg border border-error-container bg-error-container px-4 py-3 text-sm font-semibold text-error">
          {error}
        </div>
      )}
      {loading ? (
        <div className="panel p-6 text-on-surface-variant">Đang tải danh sách sinh viên...</div>
      ) : (
        <DataTable
          actions={(row) => (
            <div className="flex justify-end gap-2">
              <Link
                className="rounded-lg border border-outline-variant px-3 py-2 text-sm font-semibold text-primary hover:bg-surface-container"
                to={`/admin/students/${row.id}`}
              >
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
          rows={filteredStudents}
        />
      )}
    </>
  );
}

export default StudentListPage;
