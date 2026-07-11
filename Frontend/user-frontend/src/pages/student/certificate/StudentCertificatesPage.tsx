import { FilePlus2, FileText, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../../../components/Card";
import PageHeader from "../../../components/PageHeader";
import PaginationControls from "../../../components/PaginationControls";
import StatusBadge from "../../../components/StatusBadge";
import type { StatusType } from "../../../data/mockData";
import { usePaginatedList } from "../../../hooks/usePaginatedList";
import { certificationRequestApi, type ConfirmationRequest } from "../../../services/api";

function StudentCertificatesPage() {
  const [requests, setRequests] = useState<ConfirmationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const data = await certificationRequestApi.listMine();
      setRequests(data);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không tải được danh sách yêu cầu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadRequests();
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [loadRequests]);

  const cancelRequest = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy yêu cầu này?")) return;
    try {
      await certificationRequestApi.cancelMine(id);
      setRequests((current) => current.map((request) => (request.id === id ? { ...request, status: "CANCELLED" } : request)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Không thể hủy yêu cầu.");
    }
  };

  const {
    pageItems: paginatedRequests,
    pageIndex,
    pageSize,
    totalItems,
    setPageIndex,
    setPageSize,
  } = usePaginatedList(requests);

  return (
    <div className="space-y-gutter">
      <PageHeader
        title="Đơn xác nhận"
        subtitle="Theo dõi giấy xác nhận đã gửi, lịch hẹn nhận kết quả và trạng thái xử lý."
      />

      <div className="flex justify-end gap-3">
        <button className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" onClick={loadRequests} type="button">
          <RefreshCw className="h-5 w-5" />
          Tải lại
        </button>
        <Link className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary" to="/student/certificates/new">
          <FilePlus2 className="h-5 w-5" />
          Tạo yêu cầu mới
        </Link>
      </div>

      {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">{message}</div>}

      {loading ? (
        <div className="panel p-6 text-on-surface-variant">Đang tải danh sách...</div>
      ) : requests.length === 0 ? (
        <div className="panel p-6 text-center text-on-surface-variant">Bạn chưa có yêu cầu cấp giấy xác nhận nào.</div>
      ) : (
        <>
          <div className="grid gap-gutter">
            {paginatedRequests.map((certificate) => (
              <Card key={certificate.id}>
                <div className="grid gap-5 md:grid-cols-[auto_1fr_auto] md:items-center">
                  <div className="rounded-lg bg-primary-fixed p-3 text-primary">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold text-on-surface">{certificate.formTypeName}</h2>
                      <StatusBadge status={certificate.status as StatusType} />
                    </div>
                    <p className="space-y-1 text-sm text-on-surface-variant">
                      <span>Mã đơn: #{certificate.id}</span>
                      <br />
                      <span>Gửi ngày: {certificate.createdAt ? new Date(certificate.createdAt).toLocaleString() : ""}</span>
                      <br />
                      <span>Lịch hẹn: {certificate.appointmentDate ? new Date(certificate.appointmentDate).toLocaleDateString() : "Chưa có"}</span>
                      {certificate.adminNote && <span className="mt-1 block italic text-error">Ghi chú: {certificate.adminNote}</span>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {certificate.status === "PENDING" && (
                      <button
                        className="inline-flex items-center gap-2 rounded-lg border border-error px-4 py-3 font-semibold text-error hover:bg-error-container"
                        onClick={() => cancelRequest(certificate.id)}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                        Hủy
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <PaginationControls
            itemLabel="yêu cầu"
            onPageChange={setPageIndex}
            onPageSizeChange={setPageSize}
            pageIndex={pageIndex}
            pageSize={pageSize}
            totalItems={totalItems}
          />
        </>
      )}
    </div>
  );
}

export default StudentCertificatesPage;
