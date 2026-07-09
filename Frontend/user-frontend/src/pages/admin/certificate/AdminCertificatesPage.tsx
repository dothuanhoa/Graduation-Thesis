import { Eye, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DataTable, { type Column } from "../../../components/DataTable";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import type { StatusType, TableRow } from "../../../data/mockData";
import { certificationRequestApi, type ConfirmationRequest } from "../../../services/api";

type RequestRow = TableRow & {
  id: string;
  studentId: string;
  formTypeName: string;
  status: string;
  createdAt: string;
  originalStatus: string;
};

const toRow = (item: ConfirmationRequest): RequestRow => ({
  id: String(item.id),
  studentId: item.studentId || (item.studentProfile?.studentId ?? "N/A"),
  formTypeName: item.formTypeName,
  status: item.status,
  originalStatus: item.status,
  createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString() : "",
});

const columns: Column<RequestRow>[] = [
  { header: "ID", key: "id" },
  { header: "MSSV", key: "studentId" },
  { header: "Loại chứng nhận", key: "formTypeName" },
  { header: "Trạng thái", key: "status", render: (row) => <StatusBadge status={row.originalStatus as StatusType} /> },
  { header: "Ngày tạo", key: "createdAt" },
];

function AdminCertificatesPage() {
  const [requests, setRequests] = useState<ConfirmationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const size = 10;
  const navigate = useNavigate();

  const loadRequests = useCallback(async (pageIndex: number) => {
    setLoading(true);
    setMessage("");
    try {
      const data = await certificationRequestApi.listAll(pageIndex, size);
      setRequests(data.content || []);
      setTotalPages(data.totalPages || 1);
      setPage(pageIndex);
    } catch (err) {
      setRequests([]);
      setMessage(err instanceof Error ? err.message : "Không tải được danh sách yêu cầu.");
    } finally {
      setLoading(false);
    }
  }, [size]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadRequests(0);
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [loadRequests]);

  const rows = requests.map(toRow);

  return (
    <div className="space-y-gutter">
      <PageHeader
        title="Quản lý Chứng nhận & Biểu mẫu"
        subtitle="Quản lý và duyệt các yêu cầu xin cấp chứng nhận, giấy xác nhận của sinh viên."
      />

      <div className="flex flex-wrap gap-3">
        <Link className="inline-flex items-center gap-2 rounded-lg bg-surface-container-high px-4 py-3 font-semibold text-primary" to="/admin/form-types">
          Quản lý Loại biểu mẫu
        </Link>
        <button className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" onClick={() => loadRequests(page)} type="button">
          <RefreshCw className="h-5 w-5" />
          Tải lại
        </button>
      </div>

      {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">{message}</div>}

      {loading ? (
        <div className="panel p-6 text-on-surface-variant">Đang tải danh sách...</div>
      ) : (
        <>
          <DataTable
            actions={(row) => (
              <div className="flex justify-end gap-2">
                <button 
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-primary hover:bg-surface-container" 
                  onClick={() => navigate(`/admin/certificates/${row.id}`)} 
                  type="button"
                >
                  <Eye className="h-4 w-4" />
                  Xem chi tiết
                </button>
              </div>
            )}
            caption="Danh sách yêu cầu chứng nhận"
            columns={columns}
            rows={rows}
          />
          
          <div className="flex items-center justify-between gap-4 py-4">
            <button 
              className="rounded-lg border border-outline-variant px-4 py-2 font-semibold text-primary disabled:opacity-50"
              disabled={page === 0}
              onClick={() => loadRequests(page - 1)}
            >
              Trang trước
            </button>
            <span className="text-sm text-on-surface-variant">
              Trang {page + 1} / {totalPages}
            </span>
            <button 
              className="rounded-lg border border-outline-variant px-4 py-2 font-semibold text-primary disabled:opacity-50"
              disabled={page >= totalPages - 1}
              onClick={() => loadRequests(page + 1)}
            >
              Trang sau
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminCertificatesPage;
