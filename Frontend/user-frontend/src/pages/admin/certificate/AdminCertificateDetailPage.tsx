import { ExternalLink, Printer, Save } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import BackButton from "../../../components/BackButton";
import Card from "../../../components/Card";
import CertificateDocument from "../../../components/certificates/CertificateDocument";
import FormField from "../../../components/FormField";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import type { StatusType } from "../../../data/mockData";
import {
  certificationRequestApi,
  type ConfirmationRequest,
  type RequestStatus,
  type UpdateStatusPayload,
} from "../../../services/api";
import { normalizeCertificateCode } from "../../../utils/certificateUtils";

const getMetadataText = (metadata: Record<string, unknown> | undefined, key: string) => {
  const value = metadata?.[key];
  if (value === null || value === undefined) return "";
  return String(value);
};

function AdminCertificateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<ConfirmationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState<UpdateStatusPayload>({
    status: "PENDING",
    adminNote: "",
    appointmentDate: "",
    metadata: {},
  });

  const loadRequest = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setMessage("");
    try {
      const data = await certificationRequestApi.getById(id);
      setRequest(data);
      setFormData({
        status: data.status,
        adminNote: data.adminNote || "",
        appointmentDate: data.appointmentDate || "",
        metadata: data.metadata || {},
      });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không tải được thông tin yêu cầu.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadRequest();
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [loadRequest]);

  const updateField = (field: keyof UpdateStatusPayload, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const updateMetadata = (key: string, value: string) => {
    setFormData((current) => ({
      ...current,
      metadata: { ...(current.metadata ?? {}), [key]: value },
    }));
  };

  const handleUpdateStatus = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || !request) return;

    setSaving(true);
    setMessage("");
    try {
      const payload: UpdateStatusPayload = { ...formData };
      if (!payload.appointmentDate) delete payload.appointmentDate;

      const updated = await certificationRequestApi.updateStatus(id, payload);
      setRequest(updated);
      setMessage("Đã cập nhật xử lý yêu cầu.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Cập nhật trạng thái thất bại.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-on-surface-variant">Đang tải chi tiết...</div>;
  }

  if (!request) {
    return (
      <div className="p-6">
        <BackButton className="mb-4" to="/admin/certificates">Quay lại</BackButton>
        <p className="text-error">{message || "Không tìm thấy yêu cầu này."}</p>
      </div>
    );
  }

  const printMetadata = {
    ...(request.metadata || {}),
    ...(formData.metadata || {}),
    reason: request.reason || getMetadataText(request.metadata, "reason"),
    contactPhone: request.contactPhone || getMetadataText(request.metadata, "contactPhone"),
    studentId: request.studentId,
  };
  const documentCode = normalizeCertificateCode(request.formCode, request.formTypeName);

  return (
    <div className="space-y-gutter">
      <BackButton className="no-print" to="/admin/certificates">Quay lại danh sách</BackButton>

      <div className="no-print flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <PageHeader
          title={`Chi tiết yêu cầu #${request.id}`}
          subtitle={`Được tạo vào: ${request.createdAt ? new Date(request.createdAt).toLocaleString("vi-VN") : "N/A"}`}
        />
        <button
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary"
          onClick={() => window.print()}
          type="button"
        >
          <Printer className="h-5 w-5" />
          In đơn
        </button>
      </div>

      {message && (
        <div className="no-print rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">
          {message}
        </div>
      )}

      <div className="print-area">
        <CertificateDocument
          adminMode
          editable
          editScope="school"
          formCode={request.formCode}
          formTypeName={request.formTypeName}
          metadata={printMetadata}
          onChange={updateMetadata}
          profile={request.studentProfile || null}
        />
      </div>

      <div className="no-print grid gap-gutter lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-bold text-on-surface">Thông tin sinh viên</h2>
          <div className="space-y-3 text-sm text-on-surface">
            <p><span className="font-semibold">Họ tên:</span> {getMetadataText(printMetadata, "fullName") || request.studentProfile?.fullName || "N/A"}</p>
            <p><span className="font-semibold">MSSV:</span> {request.studentId}</p>
            <p><span className="font-semibold">Lớp:</span> {getMetadataText(printMetadata, "classCode") || request.studentProfile?.clazz?.classCode || "N/A"}</p>
            <p><span className="font-semibold">Khoa:</span> {getMetadataText(printMetadata, "facultyName") || "N/A"}</p>
            <p><span className="font-semibold">SĐT liên hệ:</span> {request.contactPhone || getMetadataText(printMetadata, "contactPhone") || "N/A"}</p>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-bold text-on-surface">Thông tin yêu cầu</h2>
          <div className="space-y-3 text-sm text-on-surface">
            <p><span className="font-semibold">Loại giấy:</span> {request.formTypeName}</p>
            <p><span className="font-semibold">Mã mẫu:</span> {documentCode}</p>
            <p><span className="font-semibold">Học kỳ:</span> {request.semester || getMetadataText(printMetadata, "semester") || "N/A"}</p>
            <p><span className="font-semibold">Lý do:</span> {request.reason || getMetadataText(printMetadata, "reason") || "N/A"}</p>
            <p className="flex items-center gap-2">
              <span className="font-semibold">Trạng thái:</span>
              <StatusBadge status={request.status as StatusType} />
            </p>
            {request.proofFileUrl && (
              <a className="inline-flex items-center gap-2 font-semibold text-primary hover:underline" href={request.proofFileUrl} rel="noreferrer" target="_blank">
                Xem file minh chứng
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-on-surface">Xử lý yêu cầu</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Có thể chỉnh trực tiếp các ô trong phần xác nhận của nhà trường trên bản đơn phía trên trước khi bấm in.
            </p>
          </div>
          <form className="grid gap-5 md:grid-cols-2" onSubmit={handleUpdateStatus}>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-on-surface-variant">Cập nhật trạng thái</span>
              <select
                className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus-ring"
                onChange={(event) => updateField("status", event.target.value as RequestStatus)}
                value={formData.status}
              >
                <option value="PENDING">Chờ xử lý</option>
                <option value="PROCESSING">Đang xử lý</option>
                <option value="NEEDS_INFO">Cần bổ sung thông tin</option>
                <option value="COMPLETED">Đã hoàn thành</option>
                <option value="REJECTED">Từ chối</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </label>

            <FormField
              label="Ngày hẹn lấy giấy"
              onChange={(event) => updateField("appointmentDate", event.target.value)}
              type="date"
              value={formData.appointmentDate || ""}
            />

            {documentCode === "VAY_VON" && (
              <div className="grid gap-5 rounded-lg border border-outline-variant p-4 md:col-span-2 md:grid-cols-2">
                <h3 className="font-bold text-primary md:col-span-2">Thông tin nhà trường bổ sung trước khi in</h3>
                <FormField label="Ngày nhập học" type="date" value={getMetadataText(formData.metadata, "enrollmentDate")} onChange={(event) => updateMetadata("enrollmentDate", event.target.value)} />
                <FormField label="Thời gian ra trường dự kiến - tháng" value={getMetadataText(formData.metadata, "graduationMonth")} onChange={(event) => updateMetadata("graduationMonth", event.target.value)} />
                <FormField label="Thời gian ra trường dự kiến - năm" value={getMetadataText(formData.metadata, "graduationYear")} onChange={(event) => updateMetadata("graduationYear", event.target.value)} />
                <FormField label="Thời gian học tại trường (tháng)" type="number" value={getMetadataText(formData.metadata, "studyDurationMonths")} onChange={(event) => updateMetadata("studyDurationMonths", event.target.value)} />
                <FormField label="Học phí hằng tháng (VNĐ)" type="number" value={getMetadataText(formData.metadata, "monthlyTuition")} onChange={(event) => updateMetadata("monthlyTuition", event.target.value)} />
                <FormField label="Ngành học" value={getMetadataText(formData.metadata, "major")} onChange={(event) => updateMetadata("major", event.target.value)} />
              </div>
            )}

            <div className="md:col-span-2">
              <FormField
                as="textarea"
                label="Ghi chú của Phòng CTSV"
                onChange={(event) => updateField("adminNote", event.target.value)}
                placeholder="Nhập ghi chú nếu cần bổ sung thông tin, từ chối hoặc hẹn sinh viên..."
                value={formData.adminNote || ""}
              />
            </div>

            <div className="md:col-span-2">
              <button
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary disabled:opacity-60"
                disabled={saving}
                type="submit"
              >
                <Save className="h-5 w-5" />
                {saving ? "Đang cập nhật" : "Cập nhật xử lý"}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default AdminCertificateDetailPage;
