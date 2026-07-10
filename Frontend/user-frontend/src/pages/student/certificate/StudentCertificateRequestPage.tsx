import { Send, Upload } from "lucide-react";
import { useEffect, useState, type FormEvent, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../../components/Card";
import FormField from "../../../components/FormField";
import PageHeader from "../../../components/PageHeader";
import {
  certificationRequestApi,
  fileApi,
  formTypeApi,
  type CreateConfirmationRequestPayload,
  type FormType,
} from "../../../services/api";

type CertificateMetadata = Record<string, string>;

const getCurrentSemesterStr = () => {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  return month >= 9 || month === 1 ? "1" : "2";
};

function StudentCertificateRequestPage() {
  const [formTypes, setFormTypes] = useState<FormType[]>([]);
  const [formData, setFormData] = useState<CreateConfirmationRequestPayload>({
    formTypeId: "",
    reason: "",
    contactPhone: "",
    semester: getCurrentSemesterStr(),
  });
  const [metadata, setMetadata] = useState<CertificateMetadata>({});
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const loadFormTypes = async () => {
    try {
      const types = await formTypeApi.listAll();
      const activeTypes = types.filter((t) => t.isActive);
      setFormTypes(activeTypes);
      if (activeTypes.length > 0) {
        setFormData((curr) => ({ ...curr, formTypeId: activeTypes[0].id }));
      }
    } catch {
      setMessage("Không tải được danh sách loại biểu mẫu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadFormTypes();
    }, 0);
    return () => window.clearTimeout(timerId);
  }, []);

  const updateField = (
    field: keyof CreateConfirmationRequestPayload,
    value: string,
  ) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const updateMetadata = (key: string, value: string) => {
    setMetadata((curr) => ({ ...curr, [key]: value }));
  };

  const handleFormTypeChange = (value: string) => {
    updateField("formTypeId", value);
    setMetadata({});
    const type = formTypes.find((t) => String(t.id) === String(value));
    if (type?.formCode === "NVQS") {
      updateField(
        "reason",
        "Bổ sung hồ sơ xin tạm hoãn nghĩa vụ quân sự tại địa phương",
      );
    } else if (type?.formCode === "KHAC") {
      updateField("reason", "");
      setMetadata({ deductionType: "Khác" });
    } else {
      updateField("reason", "");
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.formTypeId) {
      setMessage("Vui lòng chọn loại giấy xác nhận.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
      let proofFileUrl = undefined;

      if (file) {
        setMessage("Đang tải file lên...");
        const uploadRes = await fileApi.upload(file);
        proofFileUrl = uploadRes.fileUrl;
      }

      setMessage("Đang gửi yêu cầu...");
      await certificationRequestApi.create({
        ...formData,
        proofFileUrl,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });

      navigate("/student/certificates");
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Đã có lỗi xảy ra khi tạo yêu cầu.",
      );
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6">Đang tải dữ liệu...</div>;
  }

  const selectedFormCode =
    formTypes.find((t) => String(t.id) === String(formData.formTypeId))
      ?.formCode || "";

  return (
    <div className="space-y-gutter">
      <PageHeader
        title="Tạo yêu cầu giấy xác nhận"
        subtitle="Chọn loại giấy, nhập mục đích sử dụng và thông tin liên hệ để Phòng CTSV xử lý."
      />

      {message && (
        <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">
          {message}
        </div>
      )}

      <Card>
        <form className="grid gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-semibold text-on-surface-variant">
              Loại giấy xác nhận <span className="text-error">*</span>
            </label>
            <select
              className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={formData.formTypeId}
              onChange={(e) => handleFormTypeChange(e.target.value)}
              required
            >
              <option value="" disabled>
                -- Chọn loại giấy --
              </option>
              {formTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          <FormField
            label="Số điện thoại liên hệ"
            placeholder="090..."
            value={formData.contactPhone || ""}
            onChange={(e) => updateField("contactPhone", e.target.value)}
            required
          />
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-on-surface-variant">
              Học kỳ / Năm học
            </label>
            <div className="w-full rounded-lg border border-outline-variant bg-surface-container px-4 py-3 text-on-surface-variant cursor-not-allowed">
              {formData.semester}
            </div>
            <p className="text-xs text-on-surface-variant">
              Hệ thống tự động tính toán.
            </p>
          </div>

          <div className="flex flex-col gap-2 md:col-span-2">
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-on-surface-variant">
                Tệp minh chứng (Không bắt buộc)
              </label>
              <span className="text-xs text-on-surface-variant">
                Lưu ý: Nếu có hồ sơ bổ sung do CTSV yêu cầu, bạn có thể nộp trực
                tiếp tại phòng CTSV.
              </span>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-outline-variant bg-surface px-4 py-3 text-primary hover:bg-surface-container">
                <Upload className="h-5 w-5" />
                <span>{file ? file.name : "Chọn file đính kèm"}</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              {file && (
                <button
                  type="button"
                  className="text-sm text-error hover:underline"
                  onClick={() => setFile(null)}
                >
                  Xóa
                </button>
              )}
            </div>
          </div>

          {selectedFormCode === "KHAC" ? (
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-semibold text-on-surface-variant">
                Lý do xác nhận <span className="text-error">*</span>
              </label>
              <div className="flex items-center gap-4 mb-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="deductionType"
                    checked={metadata.deductionType === "Giảm trừ gia cảnh"}
                    onChange={() => {
                      updateMetadata("deductionType", "Giảm trừ gia cảnh");
                      updateField("reason", "Giảm trừ gia cảnh");
                    }}
                  />
                  Xác nhận giảm trừ gia cảnh
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="deductionType"
                    checked={metadata.deductionType === "Khác"}
                    onChange={() => {
                      updateMetadata("deductionType", "Khác");
                      updateField("reason", "");
                    }}
                  />
                  Xác nhận khác
                </label>
              </div>
              {metadata.deductionType === "Khác" && (
                <FormField
                  as="textarea"
                  label="Ghi chú chi tiết"
                  placeholder="Ghi rõ yêu cầu cần xác nhận..."
                  value={formData.reason || ""}
                  onChange={(e) => updateField("reason", e.target.value)}
                  required
                />
              )}
            </div>
          ) : selectedFormCode === "VAY_VON" ? (
            <>
              <FormField
                label="Số CMND/CCCD"
                required
                value={metadata.cmnd || ""}
                onChange={(e) => updateMetadata("cmnd", e.target.value)}
              />
              <FormField
                label="Ngày cấp"
                type="date"
                required
                value={metadata.ngayCap || ""}
                onChange={(e) => updateMetadata("ngayCap", e.target.value)}
              />
              <FormField
                label="Nơi cấp"
                required
                value={metadata.noiCap || ""}
                onChange={(e) => updateMetadata("noiCap", e.target.value)}
              />
              <div className="flex flex-col gap-2 md:col-span-2 mb-2">
                <label className="text-sm font-semibold text-on-surface-variant">
                  Thuộc đối tượng <span className="text-error">*</span>
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="doiTuong"
                      checked={metadata.doiTuong === "Mồ côi"}
                      onChange={() => updateMetadata("doiTuong", "Mồ côi")}
                      required
                    />
                    Mồ côi
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="doiTuong"
                      checked={metadata.doiTuong === "Không mồ côi"}
                      onChange={() =>
                        updateMetadata("doiTuong", "Không mồ côi")
                      }
                    />
                    Không mồ côi
                  </label>
                </div>
              </div>
            </>
          ) : (
            <FormField
              as="textarea"
              className="md:col-span-2"
              label="Mục đích / Lý do xin cấp"
              placeholder="Nhập lý do chi tiết..."
              value={formData.reason || ""}
              onChange={(e) => updateField("reason", e.target.value)}
              required={!selectedFormCode || selectedFormCode === "NVQS"}
              disabled={selectedFormCode === "NVQS"}
            />
          )}

          <div className="md:col-span-2">
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary disabled:opacity-60"
              type="submit"
              disabled={submitting || formTypes.length === 0}
            >
              <Send className="h-5 w-5" />
              {submitting ? "Đang xử lý..." : "Gửi yêu cầu"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default StudentCertificateRequestPage;
