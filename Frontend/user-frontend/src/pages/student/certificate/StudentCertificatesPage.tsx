import { ExternalLink, FilePlus2, FileText, RefreshCw, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import Card from "../../../components/Card";
import FilterBar from "../../../components/FilterBar";
import PageHeader from "../../../components/PageHeader";
import PaginationControls from "../../../components/PaginationControls";
import StatusBadge from "../../../components/StatusBadge";
import type { StatusType } from "../../../data/mockData";
import { usePaginatedList } from "../../../hooks/usePaginatedList";
import {
  certificationRequestApi,
  fileApi,
  type ConfirmationRequest,
} from "../../../services/api";
import { includesSearch } from "../../../utils/search";

function StudentCertificatesPage() {
  const [requests, setRequests] = useState<ConfirmationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [uploadingRequestId, setUploadingRequestId] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const data = await certificationRequestApi.listMine();
      setRequests(data);
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Không tải được danh sách yêu cầu.",
      );
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
      setRequests((current) =>
        current.map((request) =>
          request.id === id ? { ...request, status: "CANCELLED" } : request,
        ),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Không thể hủy yêu cầu.");
    }
  };

  const uploadProofFile = async (requestId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingRequestId(requestId);
    setMessage("");
    try {
      const uploadRes = await fileApi.upload(file);
      const updated = await certificationRequestApi.updateMineProof(requestId, uploadRes.fileUrl);
      setRequests((current) =>
        current.map((request) => (request.id === updated.id ? { ...request, ...updated } : request)),
      );
      setMessage("Đã tải minh chứng bổ sung. Phòng CTSV sẽ kiểm tra lại đơn của bạn.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không tải được file minh chứng.");
    } finally {
      setUploadingRequestId("");
    }
  };

  const visibleRequests = useMemo(
    () => requests.filter((request) => request.status !== "CANCELLED"),
    [requests],
  );

  const filteredRequests = useMemo(
    () =>
      visibleRequests.filter((request) => {
        const matchesKeyword = includesSearch(
          `${request.id} ${request.formTypeName} ${request.adminNote ?? ""}`,
          keyword,
        );
        const matchesStatus = !statusFilter || request.status === statusFilter;
        return matchesKeyword && matchesStatus;
      }),
    [keyword, statusFilter, visibleRequests],
  );

  const {
    pageItems: paginatedRequests,
    pageIndex,
    pageSize,
    totalItems,
    setPageIndex,
    setPageSize,
  } = usePaginatedList(filteredRequests);

  return (
    <div className="space-y-gutter">
      <PageHeader
        title="Đơn xác nhận"
        subtitle="Theo dõi giấy xác nhận đã gửi, lịch hẹn nhận kết quả và trạng thái xử lý."
      />

      <div className="flex justify-end gap-3">
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary"
          onClick={loadRequests}
          type="button"
        >
          <RefreshCw className="h-5 w-5" />
          Tải lại
        </button>
        <Link
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary"
          to="/student/certificates/new"
        >
          <FilePlus2 className="h-5 w-5" />
          Tạo yêu cầu mới
        </Link>
      </div>

      {message && (
        <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">
          {message}
        </div>
      )}

      <FilterBar
        filters={[
          {
            id: "status",
            label: "Trạng thái",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "", label: "Tất cả trạng thái" },
              { value: "PENDING", label: "Chờ xử lý" },
              { value: "PROCESSING", label: "Đang xử lý" },
              { value: "REJECTED", label: "Từ chối" },
              { value: "COMPLETED", label: "Hoàn tất" },
              { value: "NEEDS_INFO", label: "Cần bổ sung" },
            ],
          },
        ]}
        onReset={() => {
          setKeyword("");
          setStatusFilter("");
        }}
        onSearchChange={setKeyword}
        resultText={`Hiển thị ${filteredRequests.length} / ${visibleRequests.length} yêu cầu`}
        searchPlaceholder="Nhập mã đơn, loại đơn hoặc ghi chú"
        searchValue={keyword}
        title="Lọc đơn xác nhận"
      />

      {loading ? (
        <div className="panel p-6 text-on-surface-variant">
          Đang tải danh sách...
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="panel p-6 text-center text-on-surface-variant">
          {visibleRequests.length === 0
            ? "Bạn chưa có yêu cầu cấp giấy xác nhận nào."
            : "Không tìm thấy đơn phù hợp với bộ lọc hiện tại."}
        </div>
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
                        <h2 className="text-xl font-bold text-on-surface">
                          {certificate.formTypeName}
                        </h2>
                        <StatusBadge
                          status={certificate.status as StatusType}
                        />
                      </div>
                      <p className="space-y-1 text-sm text-on-surface-variant">
                        <span>Mã đơn: #{certificate.id}</span>
                        <br />
                        <span>
                          Gửi ngày:{" "}
                          {certificate.createdAt
                            ? new Date(certificate.createdAt).toLocaleString()
                            : ""}
                        </span>
                        <br />
                        <span>
                          Lịch hẹn:{" "}
                          {certificate.appointmentDate
                            ? new Date(
                                certificate.appointmentDate,
                              ).toLocaleDateString()
                            : "Chưa có"}
                        </span>
                        {certificate.adminNote && (
                          <span className="mt-1 block italic text-error">
                            Ghi chú: {certificate.adminNote}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
                      {certificate.proofFileUrl && (
                        <a
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary hover:bg-surface-container"
                          href={certificate.proofFileUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Xem minh chứng
                        </a>
                      )}
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
                  {certificate.status === "NEEDS_INFO" && (
                    <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-semibold text-amber-900">Bổ sung minh chứng</p>
                          <p className="mt-1 text-sm text-amber-800">
                            Vui lòng tải file minh chứng theo ghi chú của Phòng CTSV để admin kiểm tra lại.
                          </p>
                        </div>
                        <label
                          className={`inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary ${
                            uploadingRequestId === certificate.id
                              ? "cursor-wait opacity-70"
                              : "cursor-pointer"
                          }`}
                        >
                          <Upload className="h-5 w-5" />
                          {uploadingRequestId === certificate.id ? "Đang tải..." : "Tải minh chứng"}
                          <input
                            accept="image/*,.pdf"
                            className="hidden"
                            disabled={uploadingRequestId === certificate.id}
                            onChange={(event) => void uploadProofFile(certificate.id, event)}
                            type="file"
                          />
                        </label>
                      </div>
                    </div>
                  )}
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
