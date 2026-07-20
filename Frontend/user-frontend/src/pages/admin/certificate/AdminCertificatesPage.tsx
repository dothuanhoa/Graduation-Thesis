import { CalendarCheck, ExternalLink, Eye, Printer, RefreshCw, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../../components/Card";
import CertificateDocument from "../../../components/certificates/CertificateDocument";
import DataTable, { type Column } from "../../../components/DataTable";
import FilterBar from "../../../components/FilterBar";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import type { StatusType, TableRow } from "../../../data/mockData";
import {
  certificationRequestApi,
  type ConfirmationRequest,
  type RequestStatus,
} from "../../../services/api";
import { formatVietnamDate, formatVietnamDateTime } from "../../../utils/dateTime";
import { includesSearch } from "../../../utils/search";

type RequestRow = TableRow & {
  id: string;
  studentId: string;
  formTypeName: string;
  status: string;
  appointmentDate: string;
  proofFileUrl: string;
  createdAt: string;
  originalStatus: string;
};

const toRow = (item: ConfirmationRequest): RequestRow => ({
  id: String(item.id),
  studentId: item.studentId || (item.studentProfile?.studentId ?? "N/A"),
  formTypeName: item.formTypeName,
  status: item.status,
  appointmentDate: item.appointmentDate ? formatVietnamDate(item.appointmentDate) : "Chưa hẹn",
  proofFileUrl: item.proofFileUrl || "",
  originalStatus: item.status,
  createdAt: item.createdAt ? formatVietnamDateTime(item.createdAt) : "",
});

const columns: Column<RequestRow>[] = [
  { header: "ID", key: "id" },
  { header: "MSSV", key: "studentId" },
  { header: "Loại chứng nhận", key: "formTypeName" },
  {
    header: "Trạng thái",
    key: "status",
    render: (row) => <StatusBadge status={row.originalStatus as StatusType} />,
  },
  { header: "Ngày hẹn trả", key: "appointmentDate" },
  {
    header: "Minh chứng",
    key: "proofFileUrl",
    render: (row) =>
      row.proofFileUrl ? (
        <a
          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
          href={row.proofFileUrl}
          rel="noreferrer"
          target="_blank"
        >
          Xem
          <ExternalLink className="h-4 w-4" />
        </a>
      ) : (
        <span className="text-on-surface-variant">Không có</span>
      ),
  },
  { header: "Ngày tạo", key: "createdAt" },
];

const requestStatusOptions: Array<{ value: RequestStatus; label: string }> = [
  { value: "PENDING", label: "Chờ xử lý" },
  { value: "PROCESSING", label: "Đang xử lý" },
  { value: "PRINTED", label: "Đã in" },
  { value: "NEEDS_INFO", label: "Cần bổ sung" },
  { value: "COMPLETED", label: "Hoàn tất" },
  { value: "REJECTED", label: "Từ chối" },
  { value: "CANCELLED", label: "Đã hủy" },
];

const buildPrintMetadata = (request: ConfirmationRequest) => ({
  ...(request.metadata || {}),
  reason: request.reason || request.metadata?.reason,
  contactPhone: request.contactPhone || request.metadata?.contactPhone,
  studentId: request.studentId,
});

function AdminCertificatesPage() {
  const [requests, setRequests] = useState<ConfirmationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkPrinting, setBulkPrinting] = useState(false);
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<RequestStatus | "">("");
  const [bulkAppointmentDate, setBulkAppointmentDate] = useState("");
  const [bulkAdminNote, setBulkAdminNote] = useState("");
  const [printRequests, setPrintRequests] = useState<ConfirmationRequest[]>([]);
  const navigate = useNavigate();

  const loadRequests = useCallback(
    async (pageIndex: number, size = pageSize) => {
      setLoading(true);
      setMessage("");
      try {
        const data = await certificationRequestApi.listAll(pageIndex, size);
        setRequests(data.content || []);
        setTotalElements(data.totalElements || data.content?.length || 0);
        setPage(pageIndex);
      } catch (err) {
        setRequests([]);
        setMessage(
          err instanceof Error
            ? err.message
            : "Không tải được danh sách yêu cầu.",
        );
      } finally {
        setLoading(false);
      }
    },
    [pageSize],
  );

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadRequests(0);
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [loadRequests]);

  const filteredRequests = useMemo(
    () =>
      requests
        .filter((item) => item.status !== "CANCELLED")
        .filter((item) => {
          const studentId = item.studentId || item.studentProfile?.studentId || "";
          const matchesKeyword = includesSearch(`${studentId} ${item.formTypeName} ${item.id}`, keyword);
          const matchesStatus = !statusFilter || item.status === statusFilter;
          return matchesKeyword && matchesStatus;
        }),
    [keyword, requests, statusFilter],
  );

  const rows = filteredRequests.map(toRow);
  const hasActiveFilters = Boolean(keyword || statusFilter);
  const hasBulkPayload = Boolean(bulkStatus || bulkAppointmentDate || bulkAdminNote.trim());

  const handleBulkUpdate = async () => {
    if (selectedRequestIds.length === 0) {
      setMessage("Vui lòng chọn ít nhất một đơn để xử lý hàng loạt.");
      return;
    }

    if (!hasBulkPayload) {
      setMessage("Vui lòng chọn trạng thái, ngày hẹn trả hoặc nhập ghi chú cần cập nhật.");
      return;
    }

    setBulkSaving(true);
    setMessage("");
    try {
      const updatedCount = selectedRequestIds.length;
      await certificationRequestApi.bulkUpdateStatus({
        requestIds: selectedRequestIds,
        status: bulkStatus || undefined,
        appointmentDate: bulkAppointmentDate || undefined,
        adminNote: bulkAdminNote.trim() || undefined,
      });
      setSelectedRequestIds([]);
      setBulkStatus("");
      setBulkAppointmentDate("");
      setBulkAdminNote("");
      await loadRequests(page, pageSize);
      setMessage(`Đã cập nhật ${updatedCount} đơn.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không cập nhật được các đơn đã chọn.");
    } finally {
      setBulkSaving(false);
    }
  };

  const handleBulkPrint = async () => {
    if (selectedRequestIds.length === 0) {
      setMessage("Vui lòng chọn ít nhất một đơn để in.");
      return;
    }

    setBulkPrinting(true);
    setMessage("");
    try {
      const documents = await Promise.all(
        selectedRequestIds.map((requestId) => certificationRequestApi.getById(requestId)),
      );
      setPrintRequests(documents);
      window.setTimeout(() => window.print(), 80);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không tải được dữ liệu để in đơn.");
    } finally {
      setBulkPrinting(false);
    }
  };

  return (
    <div className="space-y-gutter">
      <PageHeader
        title="Quản lý đơn từ"
        subtitle="Theo dõi, cập nhật trạng thái, hẹn ngày trả và in các đơn xác nhận của sinh viên."
      />

      <div className="flex flex-wrap gap-3">
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary"
          onClick={() => loadRequests(page, pageSize)}
          type="button"
        >
          <RefreshCw className="h-5 w-5" />
          Tải lại
        </button>
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
              { value: "PRINTED", label: "Đã in" },
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
        resultText={`Hiển thị ${filteredRequests.length} / ${requests.filter((item) => item.status !== "CANCELLED").length} yêu cầu trong trang hiện tại`}
        searchPlaceholder="Nhập MSSV, loại đơn hoặc mã đơn"
        searchValue={keyword}
        title="Lọc danh sách đơn từ"
      />

      <Card>
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-lg font-bold text-on-surface">Xử lý hàng loạt</h2>
          <p className="text-sm text-on-surface-variant">
            Đã chọn {selectedRequestIds.length} đơn. Chọn các đơn trong bảng bên dưới rồi cập nhật hoặc in cùng lúc.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1.4fr_auto_auto] xl:items-end">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">Trạng thái mới</span>
            <select
              className="h-12 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface focus-ring"
              onChange={(event) => setBulkStatus(event.target.value as RequestStatus | "")}
              value={bulkStatus}
            >
              <option value="">Giữ nguyên trạng thái</option>
              {requestStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">Ngày hẹn trả</span>
            <input
              className="h-12 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface focus-ring"
              onChange={(event) => setBulkAppointmentDate(event.target.value)}
              type="date"
              value={bulkAppointmentDate}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">Ghi chú</span>
            <input
              className="h-12 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface focus-ring"
              onChange={(event) => setBulkAdminNote(event.target.value)}
              placeholder="Ghi chú áp dụng cho các đơn đã chọn"
              value={bulkAdminNote}
            />
          </label>

          <button
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-semibold text-on-primary disabled:opacity-60"
            disabled={bulkSaving || selectedRequestIds.length === 0 || !hasBulkPayload}
            onClick={() => void handleBulkUpdate()}
            type="button"
          >
            {bulkAppointmentDate ? <CalendarCheck className="h-5 w-5" /> : <Save className="h-5 w-5" />}
            {bulkSaving ? "Đang lưu" : "Cập nhật"}
          </button>

          <button
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 font-semibold text-primary disabled:opacity-60"
            disabled={bulkPrinting || selectedRequestIds.length === 0}
            onClick={() => void handleBulkPrint()}
            type="button"
          >
            <Printer className="h-5 w-5" />
            {bulkPrinting ? "Đang tải" : "In đã chọn"}
          </button>
        </div>
      </Card>

      {loading ? (
        <div className="panel p-6 text-on-surface-variant">
          Đang tải danh sách...
        </div>
      ) : (
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
          getRowId={(row) => row.id}
          itemLabel="yêu cầu"
          onSelectedRowIdsChange={setSelectedRequestIds}
          rows={rows}
          selectedRowIds={selectedRequestIds}
          serverPagination={{
            pageIndex: page,
            pageSize,
            totalItems: hasActiveFilters ? rows.length : totalElements,
            onPageChange: (nextPage) => void loadRequests(nextPage, pageSize),
            onPageSizeChange: (nextPageSize) => {
              setPageSize(nextPageSize);
              void loadRequests(0, nextPageSize);
            },
          }}
        />
      )}

      {printRequests.length > 0 && (
        <div className="print-area bulk-print-area">
          {printRequests.map((request) => (
            <CertificateDocument
              adminMode
              formCode={request.formCode}
              formTypeName={request.formTypeName}
              key={request.id}
              metadata={buildPrintMetadata(request)}
              profile={request.studentProfile || null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminCertificatesPage;
