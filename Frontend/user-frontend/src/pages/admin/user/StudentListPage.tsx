import { RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DataTable, { type Column } from "../../../components/DataTable";
import FilterBar from "../../../components/FilterBar";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import { useAuth } from "../../../context/useAuth";
import type { StatusType, TableRow } from "../../../data/mockData";
import { ApiError, userApi, type UserProfile } from "../../../services/api";

type StudentRow = TableRow & {
  id: number;
  studentCode: string;
  name: string;
  className: string;
  faculty: string;
  status: StatusType;
};

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
      <FilterBar searchPlaceholder="MSSV, họ tên..." />
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
          rows={students}
        />
      )}
    </>
  );
}

export default StudentListPage;
