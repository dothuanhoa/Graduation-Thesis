import { Send, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../../components/Card";
import CertificateDocument, { normalizeCertificateCode } from "../../../components/certificates/CertificateDocument";
import PageHeader from "../../../components/PageHeader";
import { useAuth } from "../../../context/useAuth";
import {
  certificationRequestApi,
  fileApi,
  formTypeApi,
  userApi,
  type CreateConfirmationRequestPayload,
  type FormType,
  type UserProfile,
} from "../../../services/api";

type CertificateMetadata = Record<string, string>;

const getCurrentSemesterStr = () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  return month >= 9 || month === 1 ? "1" : "2";
};

const getCurrentSchoolYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const startYear = now.getMonth() + 1 >= 9 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const isSupportedCertificateType = (type: FormType) => {
  const raw = `${type.formCode || ""} ${type.name || ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  return raw.includes("NVQS")
    || raw.includes("KHAC")
    || raw.includes("QUAN SU")
    || raw.includes("NGHIA VU")
    || raw.includes("VAY")
    || raw.includes("VON");
};

const getInitialMetadata = (profile: UserProfile | null, formType?: FormType): CertificateMetadata => {
  const formCode = normalizeCertificateCode(formType?.formCode, formType?.name);
  const common: CertificateMetadata = {
    formCode,
    fullName: profile?.fullName || "",
    studentId: profile?.studentId || "",
    dob: profile?.dob || "",
    gender: profile?.gender === "FEMALE" ? "Nữ" : profile?.gender === "MALE" ? "Nam" : "",
    contactPhone: profile?.contactPhone || "",
    classCode: profile?.clazz?.classCode || "",
    facultyName: profile?.clazz?.faculty?.facultyName || profile?.clazz?.faculty?.facultyCode || "",
    educationLevel: "Đại học",
    trainingType: "Chính quy",
    semester: getCurrentSemesterStr(),
    schoolYear: getCurrentSchoolYear(),
    requestSchoolYear: getCurrentSchoolYear(),
    requestDate: todayIso(),
    principalName: "PGS. TS. Cao Hào Thi",
  };

  if (formCode === "NVQS") {
    return {
      ...common,
      reason: "Bổ sung hồ sơ xin tạm hoãn nghĩa vụ quân sự tại địa phương",
    };
  }

  if (formCode === "VAY_VON") {
    return {
      ...common,
      schoolCode: "DSG",
      schoolName: "Trường Đại học Công nghệ Sài Gòn",
      bankAccount: "8770199, tại ngân hàng Á Châu (ACB)",
      tuitionSupportType: "Không miễn giảm",
      orphanStatus: "Không mồ côi",
    };
  }

  return {
    ...common,
    deductionType: "Không",
  };
};

function StudentCertificateRequestPage() {
  const { username } = useAuth();
  const navigate = useNavigate();
  const [formTypes, setFormTypes] = useState<FormType[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formTypeId, setFormTypeId] = useState("");
  const [metadata, setMetadata] = useState<CertificateMetadata>({});
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const selectedFormType = useMemo(
    () => formTypes.find((type) => String(type.id) === String(formTypeId)),
    [formTypeId, formTypes],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const [types, currentProfile] = await Promise.all([
        formTypeApi.listAll(),
        username ? userApi.getByStudentId(username, { suppressToast: true }) : Promise.resolve(null),
      ]);
      const activeTypes = types.filter((type) => type.isActive);
      const supportedTypes = activeTypes.filter(isSupportedCertificateType);
      const nextTypes = supportedTypes.length > 0 ? supportedTypes : activeTypes;
      const firstType = nextTypes[0];

      setProfile(currentProfile);
      setFormTypes(nextTypes);
      setFormTypeId(firstType?.id || "");
      setMetadata(getInitialMetadata(currentProfile, firstType));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không tải được dữ liệu tạo đơn xác nhận.");
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [loadData]);

  const handleFormTypeChange = (value: string) => {
    const nextType = formTypes.find((type) => String(type.id) === String(value));
    setFormTypeId(value);
    setMetadata(getInitialMetadata(profile, nextType));
  };

  const updateMetadata = (key: string, value: string) => {
    setMetadata((current) => ({ ...current, [key]: value }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFormType) {
      setMessage("Vui lòng chọn loại đơn xác nhận.");
      return;
    }

    if (!metadata.contactPhone?.trim()) {
      setMessage("Vui lòng nhập số điện thoại liên hệ trên đơn.");
      return;
    }

    if (!metadata.reason?.trim()) {
      setMessage("Vui lòng nhập lý do/yêu cầu xác nhận trên đơn.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      let proofFileUrl: string | undefined;
      if (file) {
        setMessage("Đang tải file minh chứng lên...");
        const uploadRes = await fileApi.upload(file);
        proofFileUrl = uploadRes.fileUrl;
      }

      const payload: CreateConfirmationRequestPayload = {
        formTypeId: selectedFormType.id,
        reason: metadata.reason,
        contactPhone: metadata.contactPhone,
        semester: metadata.semester || getCurrentSemesterStr(),
        proofFileUrl,
        metadata: {
          ...metadata,
          formTypeName: selectedFormType.name,
          formCode: normalizeCertificateCode(selectedFormType.formCode, selectedFormType.name),
        },
      };

      await certificationRequestApi.create(payload);
      navigate("/student/certificates");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Đã có lỗi xảy ra khi tạo yêu cầu.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-on-surface-variant">Đang tải dữ liệu tạo đơn...</div>;
  }

  return (
    <div className="space-y-gutter">
      <PageHeader
        title="Tạo đơn xin xác nhận"
        subtitle="Chọn đúng mẫu đơn và điền trực tiếp vào các ô trống trên tờ đơn như mẫu giấy thực tế của trường."
      />

      {message && (
        <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">
          {message}
        </div>
      )}

      <Card>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-on-surface">Loại đơn xác nhận</span>
              <select
                className="h-12 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-on-surface focus-ring"
                onChange={(event) => handleFormTypeChange(event.target.value)}
                required
                value={formTypeId}
              >
                <option value="" disabled>Chọn loại đơn</option>
                {formTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 font-semibold text-primary hover:bg-surface-container-low">
              <Upload className="h-5 w-5" />
              <span>{file ? file.name : "File minh chứng"}</span>
              <input className="hidden" onChange={handleFileChange} type="file" />
            </label>
          </div>

          <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
            <CertificateDocument
              editable
              formCode={selectedFormType?.formCode}
              formTypeName={selectedFormType?.name}
              metadata={metadata}
              onChange={updateMetadata}
              profile={profile}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary disabled:opacity-60"
              disabled={submitting || !selectedFormType}
              type="submit"
            >
              <Send className="h-5 w-5" />
              {submitting ? "Đang gửi đơn..." : "Gửi đơn xác nhận"}
            </button>
            <p className="text-sm text-on-surface-variant">
              Sau khi gửi, Phòng CTSV sẽ kiểm tra thông tin, yêu cầu bổ sung nếu thiếu hoặc hẹn ngày nhận giấy khi hoàn tất.
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default StudentCertificateRequestPage;
