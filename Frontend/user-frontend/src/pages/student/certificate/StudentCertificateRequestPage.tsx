import { Send, Upload } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../../../components/BackButton";
import Card from "../../../components/Card";
import CertificateDocument from "../../../components/certificates/CertificateDocument";
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
import { normalizeCertificateCode } from "../../../utils/certificateUtils";
import {
  reportFormError,
  scrollToFormMessage,
} from "../../../utils/formFeedback";

type CertificateMetadata = Record<string, string>;
type RequiredMetadataField = {
  key: string;
  label: string;
};

const commonRequiredFields: RequiredMetadataField[] = [
  { key: "fullName", label: "Họ và tên" },
  { key: "studentId", label: "Mã số sinh viên" },
  { key: "dob", label: "Ngày sinh" },
  { key: "gender", label: "Giới tính" },
  { key: "contactPhone", label: "Số điện thoại" },
  { key: "classCode", label: "Lớp" },
  { key: "facultyName", label: "Khoa" },
  { key: "educationLevel", label: "Hệ đào tạo" },
  { key: "trainingType", label: "Hệ đào tạo" },
  { key: "requestDate", label: "Ngày làm đơn" },
];

const requiredFieldsByFormCode: Record<string, RequiredMetadataField[]> = {
  NVQS: [
    { key: "permanentAddress", label: "Hộ khẩu thường trú" },
    { key: "academicYear", label: "Khóa học" },
    { key: "requestSchoolYear", label: "Năm học" },
    { key: "reason", label: "Lý do xác nhận" },
  ],
  KHAC: [
    { key: "permanentAddress", label: "Hộ khẩu thường trú" },
    { key: "reason", label: "Lý do/yêu cầu xác nhận" },
    { key: "deductionType", label: "Xác nhận giảm trừ gia cảnh" },
  ],
  VAY_VON: [
    { key: "cmnd", label: "CMND/CCCD" },
    { key: "issueDate", label: "Ngày cấp CMND/CCCD" },
    { key: "issuePlace", label: "Nơi cấp CMND/CCCD" },
    { key: "schoolCode", label: "Mã trường" },
    { key: "schoolName", label: "Tên trường" },
    { key: "major", label: "Ngành học" },
    { key: "academicYear", label: "Khóa học" },
    { key: "enrollmentDate", label: "Ngày nhập học" },
    { key: "graduationMonth", label: "Tháng ra trường dự kiến" },
    { key: "graduationYear", label: "Năm ra trường dự kiến" },
    { key: "studyDurationMonths", label: "Thời gian học tại trường" },
    { key: "monthlyTuition", label: "Học phí hằng tháng" },
    { key: "tuitionSupportType", label: "Diện miễn/giảm học phí" },
    { key: "orphanStatus", label: "Đối tượng mồ côi" },
    { key: "bankAccount", label: "Số tài khoản của nhà trường" },
    { key: "principalName", label: "Người ký xác nhận" },
  ],
};

const phonePattern = /^\s*(0|\+84)\d{8,10}\s*$/;

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

const getRequiredFields = (formCode: string) => [
  ...commonRequiredFields,
  ...(requiredFieldsByFormCode[formCode] ?? requiredFieldsByFormCode.KHAC),
];

const metadataValue = (metadata: CertificateMetadata, key: string) =>
  (metadata[key] || "").trim();

const validateMetadataForForm = (
  formCode: string,
  metadata: CertificateMetadata,
) => {
  const missingFields = getRequiredFields(formCode)
    .filter((field) => !metadataValue(metadata, field.key))
    .map((field) => field.label);

  if (missingFields.length > 0) {
    return `Vui lòng nhập đầy đủ thông tin trên đơn: ${missingFields.join(", ")}.`;
  }

  const contactPhone = metadataValue(metadata, "contactPhone");
  if (!phonePattern.test(contactPhone)) {
    return "Số điện thoại liên hệ không hợp lệ.";
  }

  if (formCode === "VAY_VON") {
    const graduationMonth = Number(metadataValue(metadata, "graduationMonth"));
    const graduationYear = Number(metadataValue(metadata, "graduationYear"));
    const studyDurationMonths = Number(
      metadataValue(metadata, "studyDurationMonths"),
    );
    const monthlyTuition = Number(metadataValue(metadata, "monthlyTuition"));

    if (
      !Number.isInteger(graduationMonth) ||
      graduationMonth < 1 ||
      graduationMonth > 12
    ) {
      return "Tháng ra trường dự kiến phải từ 1 đến 12.";
    }
    if (
      !Number.isInteger(graduationYear) ||
      graduationYear < 2000 ||
      graduationYear > 2100
    ) {
      return "Năm ra trường dự kiến phải từ 2000 đến 2100.";
    }
    if (
      !Number.isInteger(studyDurationMonths) ||
      studyDurationMonths < 1 ||
      studyDurationMonths > 120
    ) {
      return "Thời gian học tại trường phải từ 1 đến 120 tháng.";
    }
    if (
      !Number.isInteger(monthlyTuition) ||
      monthlyTuition < 1 ||
      monthlyTuition > 100_000_000
    ) {
      return "Học phí hằng tháng phải là số tiền hợp lệ.";
    }
  }

  return "";
};

const isSupportedCertificateType = (type: FormType) => {
  const raw = `${type.formCode || ""} ${type.name || ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  return (
    raw.includes("NVQS") ||
    raw.includes("KHAC") ||
    raw.includes("QUAN SU") ||
    raw.includes("NGHIA VU") ||
    raw.includes("VAY") ||
    raw.includes("VON")
  );
};

const getInitialMetadata = (
  profile: UserProfile | null,
  formType?: FormType,
): CertificateMetadata => {
  const formCode = normalizeCertificateCode(formType?.formCode, formType?.name);
  const academicYear = profile?.clazz?.academicYear?.yearName || "";
  const common: CertificateMetadata = {
    formCode,
    fullName: profile?.fullName || "",
    studentId: profile?.studentId || "",
    dob: profile?.dob || "",
    gender:
      profile?.gender === "FEMALE"
        ? "Nữ"
        : profile?.gender === "MALE"
          ? "Nam"
          : "",
    contactPhone: profile?.contactPhone || "",
    classCode: profile?.clazz?.classCode || "",
    facultyName:
      profile?.clazz?.faculty?.facultyName ||
      profile?.clazz?.faculty?.facultyCode ||
      "",
    educationLevel: "Đại học",
    trainingType: "Chính quy",
    academicYear,
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
      reason: "Vay vốn sinh viên",
      graduationMonth: "",
      graduationYear: "",
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
  const messageRef = useRef<HTMLDivElement | null>(null);

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
        username
          ? userApi.getByStudentId(username, { suppressToast: true })
          : Promise.resolve(null),
      ]);
      const activeTypes = types.filter((type) => type.isActive);
      const supportedTypes = activeTypes.filter(isSupportedCertificateType);
      const nextTypes =
        supportedTypes.length > 0 ? supportedTypes : activeTypes;
      const firstType = nextTypes[0];

      setProfile(currentProfile);
      setFormTypes(nextTypes);
      setFormTypeId(firstType?.id || "");
      setMetadata(getInitialMetadata(currentProfile, firstType));
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Không tải được dữ liệu tạo đơn xác nhận.",
      );
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
    const nextType = formTypes.find(
      (type) => String(type.id) === String(value),
    );
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
    const showError = (errorMessage: string) => {
      setMessage(errorMessage);
      reportFormError(errorMessage, messageRef.current);
    };

    if (!selectedFormType) {
      showError("Vui lòng chọn loại đơn xác nhận.");
      return;
    }

    if (!metadata.contactPhone?.trim()) {
      showError("Vui lòng nhập số điện thoại liên hệ trên đơn.");
      return;
    }

    const formCode = normalizeCertificateCode(
      selectedFormType.formCode,
      selectedFormType.name,
    );
    const requestReason =
      metadata.reason?.trim() ||
      (formCode === "VAY_VON" ? "Vay vốn sinh viên" : "");

    const preparedMetadata: CertificateMetadata = {
      ...metadata,
      reason: requestReason,
      contactPhone: metadata.contactPhone?.trim() || "",
      semester: metadata.semester?.trim() || getCurrentSemesterStr(),
      formTypeName: selectedFormType.name,
      formCode,
    };

    if (!requestReason) {
      showError("Vui lòng nhập lý do/yêu cầu xác nhận trên đơn.");
      return;
    }

    const metadataError = validateMetadataForForm(formCode, preparedMetadata);
    if (metadataError) {
      showError(metadataError);
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
        reason: requestReason,
        contactPhone: preparedMetadata.contactPhone,
        semester: preparedMetadata.semester,
        proofFileUrl,
        metadata: preparedMetadata,
      };

      await certificationRequestApi.create(payload);
      navigate("/student/certificates");
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Đã có lỗi xảy ra khi tạo yêu cầu.",
      );
      scrollToFormMessage(messageRef.current);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-on-surface-variant">
        Đang tải dữ liệu tạo đơn...
      </div>
    );
  }

  return (
    <div className="space-y-gutter">
      <BackButton to="/student/certificates">Quay lại danh sách đơn</BackButton>

      <PageHeader
        title="Tạo đơn xin xác nhận"
        subtitle="Chọn đúng mẫu đơn và điền trực tiếp vào các ô trống trên tờ đơn như mẫu giấy thực tế của trường."
      />

      {message && (
        <div
          className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary"
          data-form-message
          ref={messageRef}
        >
          {message}
        </div>
      )}

      <Card>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-on-surface">
                Loại đơn xác nhận
              </span>
              <select
                className="h-12 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-on-surface focus-ring"
                onChange={(event) => handleFormTypeChange(event.target.value)}
                required
                value={formTypeId}
              >
                <option value="" disabled>
                  Chọn loại đơn
                </option>
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
              <input
                className="hidden"
                onChange={handleFileChange}
                type="file"
              />
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
              Sau khi gửi, Phòng CTSV sẽ kiểm tra thông tin, yêu cầu bổ sung nếu
              thiếu hoặc hẹn ngày nhận giấy khi hoàn tất.
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default StudentCertificateRequestPage;
