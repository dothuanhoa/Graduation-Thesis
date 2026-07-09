import { ArrowLeft, Save } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import Card from "../../../components/Card";
import FormField from "../../../components/FormField";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import type { StatusType } from "../../../data/mockData";
import { certificationRequestApi, type ConfirmationRequest, type RequestStatus, type UpdateStatusPayload } from "../../../services/api";

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
      if (!payload.appointmentDate) {
        delete payload.appointmentDate;
      }

      const updated = await certificationRequestApi.updateStatus(id, payload);
      setRequest(updated);
      setMessage("Đã cập nhật trạng thái thành công.");
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
        <Link className="mb-4 inline-flex items-center gap-2 text-primary hover:underline" to="/admin/certificates">
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </Link>
        <p className="text-error">{message || "Không tìm thấy yêu cầu này."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-gutter">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline" to="/admin/certificates">
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách
      </Link>

      <PageHeader
        title={`Chi tiết yêu cầu #${request.id}`}
        subtitle={`Được tạo vào: ${request.createdAt ? new Date(request.createdAt).toLocaleString() : "N/A"}`}
      />

      {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">{message}</div>}

      <div className="grid gap-gutter lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-bold text-on-surface">Thông tin Sinh viên</h2>
          <div className="space-y-3 text-sm text-on-surface">
            <p><span className="font-semibold">Họ tên:</span> {request.studentProfile?.fullName || "N/A"}</p>
            <p><span className="font-semibold">MSSV:</span> {request.studentProfile?.studentId || request.studentId}</p>
            <p><span className="font-semibold">Lớp:</span> {request.studentProfile?.clazz?.classCode || "N/A"}</p>
            <p><span className="font-semibold">SĐT liên hệ:</span> {request.contactPhone || "N/A"}</p>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-bold text-on-surface">Thông tin Yêu cầu</h2>
          <div className="space-y-3 text-sm text-on-surface">
            <p><span className="font-semibold">Loại giấy:</span> {request.formTypeName}</p>
            <p><span className="font-semibold">Học kỳ:</span> {request.semester || "N/A"}</p>
            <p><span className="font-semibold">Lý do:</span> {request.reason || "N/A"}</p>
            <div>
              <span className="font-semibold">File minh chứng: </span>
              {request.proofFileUrl ? (
                <a href={request.proofFileUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  Xem file đính kèm
                </a>
              ) : (
                "Không có"
              )}
            </div>
            {request.metadata && Object.keys(request.metadata).length > 0 && (
              <div className="mt-2 rounded-lg bg-surface-container-low p-3">
                <span className="font-semibold block mb-2">Thông tin bổ sung (từ Sinh viên):</span>
                {getMetadataText(request.metadata, "deductionType") && <p>- Loại giảm trừ: {getMetadataText(request.metadata, "deductionType")}</p>}
                {getMetadataText(request.metadata, "cmnd") && <p>- CMND/CCCD: {getMetadataText(request.metadata, "cmnd")}</p>}
                {getMetadataText(request.metadata, "ngayCap") && <p>- Ngày cấp: {getMetadataText(request.metadata, "ngayCap")}</p>}
                {getMetadataText(request.metadata, "noiCap") && <p>- Nơi cấp: {getMetadataText(request.metadata, "noiCap")}</p>}
                {getMetadataText(request.metadata, "doiTuong") && <p>- Đối tượng: {getMetadataText(request.metadata, "doiTuong")}</p>}
              </div>
            )}
            <p className="flex items-center gap-2">
              <span className="font-semibold">Trạng thái hiện tại:</span>
              <StatusBadge status={request.status as StatusType} />
            </p>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-bold text-on-surface">Xử lý yêu cầu</h2>
          <form className="grid gap-5 md:grid-cols-2" onSubmit={handleUpdateStatus}>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-on-surface-variant">Cập nhật trạng thái</label>
              <select 
                className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={formData.status}
                onChange={(event) => updateField("status", event.target.value as RequestStatus)}
              >
                <option value="PENDING">Chờ xử lý (PENDING)</option>
                <option value="PROCESSING">Đang xử lý (PROCESSING)</option>
                <option value="NEEDS_INFO">Cần bổ sung thông tin (NEEDS_INFO)</option>
                <option value="COMPLETED">Đã hoàn thành (COMPLETED)</option>
                <option value="REJECTED">Từ chối (REJECTED)</option>
                <option value="CANCELLED">Đã hủy (CANCELLED)</option>
              </select>
            </div>

            <FormField 
              label="Ngày hẹn lấy giấy (Nếu có)" 
              onChange={(event) => updateField("appointmentDate", event.target.value)} 
              type="date" 
              value={formData.appointmentDate || ""} 
            />

            {(request.formCode === "GIAY_VAY_VON" || request.formCode === "GIAY_XAC_NHAN_VAY_VON") && (
              <div className="md:col-span-2 grid gap-5 md:grid-cols-2 rounded-lg border border-outline-variant p-4">
                <h3 className="md:col-span-2 font-bold text-primary">Thông tin xác nhận từ Nhà trường (Điền trước khi in)</h3>
                
                <FormField label="Ngày nhập học" type="date" value={getMetadataText(formData.metadata, "ngayNhapHoc")} onChange={(e) => updateMetadata("ngayNhapHoc", e.target.value)} />
                <FormField label="Thời gian ra trường (dự kiến)" type="date" value={getMetadataText(formData.metadata, "ngayRaTruong")} onChange={(e) => updateMetadata("ngayRaTruong", e.target.value)} />
                <FormField label="Thời gian học tại trường (tháng)" type="number" value={getMetadataText(formData.metadata, "thoiGianHoc")} onChange={(e) => updateMetadata("thoiGianHoc", e.target.value)} />
                <FormField label="Số tiền học phí hàng tháng (VNĐ)" type="number" value={getMetadataText(formData.metadata, "hocPhi")} onChange={(e) => updateMetadata("hocPhi", e.target.value)} />
                
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-on-surface-variant">Thuộc diện</label>
                  <select className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary" value={getMetadataText(formData.metadata, "thuocDien")} onChange={(e) => updateMetadata("thuocDien", e.target.value)}>
                    <option value="">-- Chọn diện --</option>
                    <option value="Không miễn giảm">Không miễn giảm</option>
                    <option value="Giảm học phí">Giảm học phí</option>
                    <option value="Miễn học phí">Miễn học phí</option>
                  </select>
                </div>
                
                <FormField label="Kỷ luật hành chính (Nếu có)" value={getMetadataText(formData.metadata, "kyLuat")} onChange={(e) => updateMetadata("kyLuat", e.target.value)} placeholder="VD: Không bị xử phạt hành chính..." />
              </div>
            )}
            
            <div className="md:col-span-2">
              <FormField 
                as="textarea" 
                label="Ghi chú của Admin" 
                onChange={(event) => updateField("adminNote", event.target.value)} 
                value={formData.adminNote || ""} 
                placeholder="Nhập ghi chú hoặc lý do nếu từ chối / cần bổ sung thông tin..."
              />
            </div>

            <div className="md:col-span-2">
              <button 
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary disabled:opacity-60" 
                disabled={saving} 
                type="submit"
              >
                <Save className="h-5 w-5" />
                {saving ? "Đang cập nhật" : "Cập nhật trạng thái"}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default AdminCertificateDetailPage;
