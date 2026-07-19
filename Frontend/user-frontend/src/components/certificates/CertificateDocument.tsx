import type { UserProfile } from "../../services/api";
import { normalizeCertificateCode } from "../../utils/certificateUtils";

type Metadata = Record<string, unknown>;

type CertificateDocumentProps = {
  formCode?: string;
  formTypeName?: string;
  metadata?: Metadata;
  profile?: UserProfile | null;
  editable?: boolean;
  editScope?: "all" | "school";
  adminMode?: boolean;
  onChange?: (key: string, value: string) => void;
};

const PRINCIPAL_NAME = "PGS. TS. Cao Hào Thi";

const text = (value: unknown) =>
  value === null || value === undefined ? "" : String(value);

const getDefaultValue = (
  key: string,
  metadata: Metadata,
  profile?: UserProfile | null,
) => {
  const current = text(metadata[key]);
  if (current) return current;

  const facultyName =
    profile?.clazz?.faculty?.facultyName ||
    profile?.clazz?.faculty?.facultyCode ||
    "";
  const defaults: Record<string, string | undefined> = {
    fullName: profile?.fullName,
    studentId: profile?.studentId,
    dob: profile?.dob,
    gender:
      profile?.gender === "FEMALE"
        ? "Nữ"
        : profile?.gender === "MALE"
          ? "Nam"
          : "",
    contactPhone: profile?.contactPhone,
    classCode: profile?.clazz?.classCode,
    facultyName,
    educationLevel: "Đại học",
    trainingType: "Chính quy",
    schoolName: "Trường Đại học Công nghệ Sài Gòn",
    principalTitle: "HIỆU TRƯỞNG",
    principalName: PRINCIPAL_NAME,
    schoolCode: "DSG",
    bankAccount: "8770199, tại ngân hàng Á Châu (ACB)",
    schoolFullName: text(metadata.fullName) || profile?.fullName,
    schoolStudentId: text(metadata.studentId) || profile?.studentId,
    schoolFacultyName: text(metadata.facultyName) || facultyName,
    schoolTrainingType: text(metadata.trainingType) || "Chính quy",
    schoolSemester: text(metadata.semester),
    schoolYear: text(metadata.schoolYear),
    schoolAcademicYear: text(metadata.academicYear),
  };

  return defaults[key] || "";
};

const splitDate = (value: string) => {
  if (!value) return { day: "", month: "", year: "" };
  const parts = value.includes("-") ? value.split("-") : value.split("/");
  if (parts.length < 3) return { day: "", month: "", year: value };
  if (value.includes("-"))
    return { day: parts[2], month: parts[1], year: parts[0] };
  return { day: parts[0], month: parts[1], year: parts[2] };
};

function Field({
  name,
  metadata,
  profile,
  editable,
  editScope,
  adminMode,
  onChange,
  className = "min-w-24",
  type = "text",
}: {
  name: string;
  metadata: Metadata;
  profile?: UserProfile | null;
  editable?: boolean;
  editScope?: "all" | "school";
  adminMode?: boolean;
  onChange?: (key: string, value: string) => void;
  className?: string;
  type?: string;
}) {
  const value = getDefaultValue(name, metadata, profile);
  const compactWidth = `${Math.max(Math.min((value || "").length + 1, 52), 2)}ch`;

  if (!canEdit({ editable, editScope }, name)) {
    if (adminMode) {
      return (
        <span className="certificate-plain-text">{value || "\u00A0"}</span>
      );
    }
    return (
      <span className={`certificate-line ${className}`}>
        {value || "\u00A0"}
      </span>
    );
  }

  return (
    <input
      className={`certificate-input ${adminMode ? "certificate-admin-inline-field" : className}`}
      onChange={(event) => onChange?.(name, event.target.value)}
      style={adminMode ? { width: compactWidth } : undefined}
      type={type}
      value={value}
    />
  );
}

const canEdit = (
  props: Pick<CertificateDocumentProps, "editable" | "editScope">,
  fieldName: string,
) => {
  if (!props.editable) return false;
  if (!props.editScope || props.editScope === "all") return true;
  return (
    props.editScope === "school" &&
    (fieldName.startsWith("school") || fieldName.startsWith("principal"))
  );
};

function DateFields({
  name,
  metadata,
  editable,
  editScope,
  adminMode,
  onChange,
}: {
  name: string;
  metadata: Metadata;
  editable?: boolean;
  editScope?: "all" | "school";
  adminMode?: boolean;
  onChange?: (key: string, value: string) => void;
}) {
  const date = splitDate(text(metadata[name]));
  const isEditable = canEdit({ editable, editScope }, name);
  const updatePart = (part: "day" | "month" | "year", value: string) => {
    const next = { ...date, [part]: value };
    onChange?.(name, `${next.year}-${next.month}-${next.day}`);
  };

  const part = (
    label: string,
    key: "day" | "month" | "year",
    width: string,
  ) => (
    <>
      <span>{label}</span>
      {isEditable ? (
        <input
          className={`certificate-input ${adminMode ? "certificate-admin-date-part" : width}`}
          maxLength={key === "year" ? 4 : 2}
          onChange={(event) => updatePart(key, event.target.value)}
          style={
            adminMode
              ? { width: key === "year" ? "4.5ch" : "2.5ch" }
              : undefined
          }
          value={date[key]}
        />
      ) : adminMode ? (
        <span className="certificate-plain-text">{date[key] || "\u00A0"}</span>
      ) : (
        <span className={`certificate-line ${width}`}>
          {date[key] || "\u00A0"}
        </span>
      )}
    </>
  );

  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap align-baseline">
      {part("ngày", "day", "w-10")}
      {part("tháng", "month", "w-10")}
      {part("năm", "year", "w-16")}
    </span>
  );
}

function RadioLine({
  name,
  options,
  metadata,
  editable,
  editScope,
  onChange,
}: {
  name: string;
  options: string[];
  metadata: Metadata;
  editable?: boolean;
  editScope?: "all" | "school";
  onChange?: (key: string, value: string) => void;
}) {
  const value = text(metadata[name]);
  const isEditable = canEdit({ editable, editScope }, name);
  return (
    <span className="inline-flex flex-wrap gap-3 align-middle">
      {options.map((option) => (
        <label key={option} className="inline-flex items-center gap-1">
          <input
            checked={value === option}
            className="certificate-checkbox"
            disabled={!isEditable}
            onChange={() => onChange?.(name, option)}
            type="checkbox"
          />
          <span>{option}</span>
        </label>
      ))}
    </span>
  );
}

function Header({ title }: { title: string }) {
  return (
    <div className="text-center leading-tight">
      <p className="font-semibold uppercase">
        CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
      </p>
      <p>Độc lập - Tự do - Hạnh phúc</p>
      <h2 className="mt-2 text-base font-bold uppercase">{title}</h2>
    </div>
  );
}

function NvqsForm(props: CertificateDocumentProps) {
  const metadata = props.metadata || {};
  return (
    <div
      className={`certificate-page ${props.adminMode ? "certificate-admin-page" : ""}`}
    >
      <Header title="Đơn xin xác nhận" />
      <div className="certificate-body">
        <p>Kính gửi: Ban Giám Hiệu Trường Đại học Công nghệ Sài Gòn</p>
        <p>
          Họ và tên:{" "}
          <Field
            name="fullName"
            {...props}
            metadata={metadata}
            className="min-w-52"
          />
        </p>
        <p>
          Sinh ngày:{" "}
          <DateFields
            name="dob"
            metadata={metadata}
            editable={props.editable}
            editScope={props.editScope}
            adminMode={props.adminMode}
            onChange={props.onChange}
          />
          <span className="ml-3">Giới tính:</span>{" "}
          <RadioLine
            name="gender"
            options={["Nam", "Nữ"]}
            {...props}
            metadata={metadata}
          />
        </p>
        <p>
          Hộ khẩu thường trú:{" "}
          <Field
            name="permanentAddress"
            {...props}
            metadata={metadata}
            className="min-w-[420px]"
          />
        </p>
        <p>
          Số điện thoại:{" "}
          <Field
            name="contactPhone"
            {...props}
            metadata={metadata}
            className="min-w-40"
          />
        </p>
        <p>
          Hiện đang học lớp:{" "}
          <Field
            name="classCode"
            {...props}
            metadata={metadata}
            className="min-w-36"
          />
          <span className="ml-3">Mã số sinh viên:</span>{" "}
          <Field
            name="studentId"
            {...props}
            metadata={metadata}
            className="min-w-36"
          />
        </p>
        <p>
          Hệ đào tạo:{" "}
          <Field
            name="educationLevel"
            {...props}
            metadata={metadata}
            className="min-w-32"
          />
          <span className="ml-3">Khóa học:</span>{" "}
          <Field
            name="academicYear"
            {...props}
            metadata={metadata}
            className="min-w-28"
          />
        </p>
        <p>
          Loại hình đào tạo:{" "}
          <Field
            name="trainingType"
            {...props}
            metadata={metadata}
            className="min-w-28"
          />
        </p>
        <p>
          Khoa:{" "}
          <Field
            name="facultyName"
            {...props}
            metadata={metadata}
            className="min-w-64"
          />
        </p>
        <p className="leading-7">
          Nay tôi làm đơn này gửi tới Ban Giám Hiệu Trường Đại học Công nghệ Sài
          Gòn xin xác nhận tôi hiện là sinh viên của Trường, năm học:{" "}
          <Field
            name="requestSchoolYear"
            {...props}
            metadata={metadata}
            className="min-w-28"
          />
          . Lý do xác nhận:{" "}
          <Field
            name="reason"
            {...props}
            metadata={metadata}
            className="min-w-64"
          />
          .
        </p>
        <p>Rất mong được sự chấp thuận của Ban Giám Hiệu.</p>
        <Signature
          metadata={metadata}
          editable={props.editable}
          editScope={props.editScope}
          adminMode={props.adminMode}
          onChange={props.onChange}
        />
        <SchoolConfirmation
          {...props}
          editable={props.adminMode ? props.editable : false}
          metadata={metadata}
        />
      </div>
    </div>
  );
}

function GeneralForm(props: CertificateDocumentProps) {
  const metadata = props.metadata || {};
  return (
    <div
      className={`certificate-page ${props.adminMode ? "certificate-admin-page" : ""}`}
    >
      <Header title="Đơn xin xác nhận 2" />
      <div className="certificate-body">
        <p>Kính gửi: Phòng Công tác Sinh viên</p>
        <p>
          Tôi tên:{" "}
          <Field
            name="fullName"
            {...props}
            metadata={metadata}
            className="min-w-52"
          />
        </p>
        <p>
          Sinh ngày:{" "}
          <DateFields
            name="dob"
            metadata={metadata}
            editable={props.editable}
            editScope={props.editScope}
            adminMode={props.adminMode}
            onChange={props.onChange}
          />
          <span className="ml-3">Giới tính:</span>{" "}
          <RadioLine
            name="gender"
            options={["Nam", "Nữ"]}
            {...props}
            metadata={metadata}
          />
        </p>
        <p>
          Học lớp:{" "}
          <Field
            name="classCode"
            {...props}
            metadata={metadata}
            className="min-w-36"
          />
          Khoa:{" "}
          <Field
            name="facultyName"
            {...props}
            metadata={metadata}
            className="min-w-48"
          />
          MSSV:{" "}
          <Field
            name="studentId"
            {...props}
            metadata={metadata}
            className="min-w-36"
          />
        </p>
        <p>
          Hộ khẩu thường trú:{" "}
          <Field
            name="permanentAddress"
            {...props}
            metadata={metadata}
            className="min-w-[420px]"
          />
        </p>
        <p>
          Bậc đào tạo:{" "}
          <Field
            name="educationLevel"
            {...props}
            metadata={metadata}
            className="min-w-28"
          />
          Hệ đào tạo:{" "}
          <Field
            name="trainingType"
            {...props}
            metadata={metadata}
            className="min-w-28"
          />{" "}
          của Trường Đại học Công nghệ Sài Gòn.
        </p>
        <p>
          Số điện thoại liên lạc:{" "}
          <Field
            name="contactPhone"
            {...props}
            metadata={metadata}
            className="min-w-36"
          />
        </p>
        <p className="leading-7">
          Nay tôi làm đơn này xin nhà trường cấp giấy chứng nhận tôi là sinh
          viên đang theo học tại trường để bổ túc hồ sơ xin:{" "}
          <Field
            name="reason"
            {...props}
            metadata={metadata}
            className="min-w-[360px]"
          />
          .
        </p>
        <p>
          Xác nhận giảm trừ gia cảnh:{" "}
          <RadioLine
            name="deductionType"
            options={["Có", "Không"]}
            {...props}
            metadata={metadata}
          />
        </p>
        <p>Trân trọng kính chào.</p>
        <Signature
          metadata={metadata}
          editable={props.editable}
          editScope={props.editScope}
          adminMode={props.adminMode}
          onChange={props.onChange}
        />
        <SchoolConfirmation compact {...props} metadata={metadata} />
      </div>
    </div>
  );
}

function LoanForm(props: CertificateDocumentProps) {
  const metadata = props.metadata || {};
  return (
    <div
      className={`certificate-page ${props.adminMode ? "certificate-admin-page" : ""}`}
    >
      <Header title="Giấy xác nhận" />
      <div className="certificate-body">
        <p>
          Họ và tên:{" "}
          <Field
            name="fullName"
            {...props}
            metadata={metadata}
            className="min-w-52"
          />
        </p>
        <p>
          Sinh ngày:{" "}
          <DateFields
            name="dob"
            metadata={metadata}
            editable={props.editable}
            editScope={props.editScope}
            adminMode={props.adminMode}
            onChange={props.onChange}
          />
          <span className="ml-3">Giới tính:</span>{" "}
          <RadioLine
            name="gender"
            options={["Nam", "Nữ"]}
            {...props}
            metadata={metadata}
          />
        </p>
        <p>
          CMND số:{" "}
          <Field
            name="cmnd"
            {...props}
            metadata={metadata}
            className="min-w-32"
          />
          ngày cấp{" "}
          <Field
            name="issueDate"
            {...props}
            metadata={metadata}
            className="min-w-28"
          />
          Nơi cấp{" "}
          <Field
            name="issuePlace"
            {...props}
            metadata={metadata}
            className="min-w-52"
          />
        </p>
        <p>
          Mã trường theo học:{" "}
          <Field
            name="schoolCode"
            {...props}
            metadata={metadata}
            className="w-16"
          />{" "}
          Tên trường:{" "}
          <Field
            name="schoolName"
            {...props}
            metadata={metadata}
            className="min-w-72"
          />
        </p>
        <p>
          Ngành học:{" "}
          <Field
            name="major"
            {...props}
            metadata={metadata}
            className="min-w-48"
          />
        </p>
        <p>
          Hệ đào tạo{" "}
          <Field
            name="educationLevel"
            {...props}
            metadata={metadata}
            className="min-w-28"
          />
          Khóa:{" "}
          <Field
            name="academicYear"
            {...props}
            metadata={metadata}
            className="min-w-28"
          />
          Loại hình đào tạo:{" "}
          <Field
            name="trainingType"
            {...props}
            metadata={metadata}
            className="min-w-28"
          />
        </p>
        <p>
          Lớp:{" "}
          <Field
            name="classCode"
            {...props}
            metadata={metadata}
            className="min-w-32"
          />
          Mã SV:{" "}
          <Field
            name="studentId"
            {...props}
            metadata={metadata}
            className="min-w-36"
          />
        </p>
        <p>
          Khoa:{" "}
          <Field
            name="facultyName"
            {...props}
            metadata={metadata}
            className="min-w-64"
          />
        </p>
        <p>
          Ngày nhập học:{" "}
          <Field
            name="enrollmentDate"
            {...props}
            metadata={metadata}
            className="min-w-28"
          />
          Thời gian ra trường dự kiến{" "}
          <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
            tháng
            <Field
              name="graduationMonth"
              {...props}
              metadata={metadata}
              className="w-12"
            />
          </span>{" "}
          <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
            năm
            <Field
              name="graduationYear"
              {...props}
              metadata={metadata}
              className="w-16"
            />
          </span>
        </p>
        <p>
          Thời gian học tại trường:{" "}
          <Field
            name="studyDurationMonths"
            {...props}
            metadata={metadata}
            className="w-16"
          />{" "}
          tháng
        </p>
        <p>
          Số tiền học phí hằng tháng:{" "}
          <Field
            name="monthlyTuition"
            {...props}
            metadata={metadata}
            className="min-w-52"
          />{" "}
          đồng.
        </p>
        <p>
          Thuộc diện:{" "}
          <RadioLine
            name="tuitionSupportType"
            options={["Không miễn giảm", "Giảm học phí", "Miễn học phí"]}
            {...props}
            metadata={metadata}
          />
        </p>
        <p>
          Thuộc đối tượng:{" "}
          <RadioLine
            name="orphanStatus"
            options={["Mồ côi", "Không mồ côi"]}
            {...props}
            metadata={metadata}
          />
        </p>
        <p>
          Trong thời gian theo học tại trường, anh/chị{" "}
          <Field
            name="fullName"
            {...props}
            metadata={metadata}
            className="min-w-52"
          />{" "}
          không bị xử phạt hành chính trở lên về các hành vi: cờ bạc, nghiện
          hút, trộm cắp, buôn lậu.
        </p>
        <p>
          Số tài khoản của nhà trường:{" "}
          <Field
            name="bankAccount"
            {...props}
            metadata={metadata}
            className="min-w-[360px]"
          />
          .
        </p>
        <Signature
          metadata={metadata}
          editable={props.editable}
          editScope={props.editScope}
          adminMode={props.adminMode}
          onChange={props.onChange}
          signerField="principalName"
          signerLabel="Hiệu trưởng"
        />
      </div>
    </div>
  );
}

function Signature({
  metadata,
  editable,
  editScope,
  adminMode,
  onChange,
  signerField = "fullName",
  signerLabel = "Người làm đơn",
}: {
  metadata: Metadata;
  editable?: boolean;
  editScope?: "all" | "school";
  adminMode?: boolean;
  onChange?: (key: string, value: string) => void;
  signerField?: string;
  signerLabel?: string;
}) {
  return (
    <div className="certificate-signature">
      <p>
        TP. Hồ Chí Minh,{" "}
        <DateFields
          name="requestDate"
          metadata={metadata}
          editable={editable}
          editScope={editScope}
          adminMode={adminMode}
          onChange={onChange}
        />
      </p>
      <p className="mt-2">{signerLabel}</p>
      <p className="certificate-sign-name font-semibold">
        <Field
          name={signerField}
          metadata={metadata}
          editable={editable}
          editScope={editScope}
          onChange={onChange}
          className="min-w-44"
        />
      </p>
    </div>
  );
}

function SchoolConfirmation({
  metadata,
  compact,
  ...props
}: CertificateDocumentProps & {
  metadata: Metadata;
  compact?: boolean;
}) {
  return (
    <div
      className={`certificate-school-confirmation ${compact ? "mt-5" : "mt-8"}`}
    >
      <p className="font-semibold uppercase">
        XÁC NHẬN CỦA TRƯỜNG ĐẠI HỌC CÔNG NGHỆ SÀI GÒN
      </p>
      <p>
        Xác nhận sinh viên:{" "}
        <Field
          name="schoolFullName"
          {...props}
          metadata={metadata}
          className="min-w-52"
        />
      </p>
      <p>
        Hiện là sinh viên năm thứ{" "}
        <Field
          name="schoolStudentYear"
          {...props}
          metadata={metadata}
          className="w-12"
        />
        Học kỳ:{" "}
        <Field
          name="schoolSemester"
          {...props}
          metadata={metadata}
          className="w-12"
        />
        Năm học{" "}
        <Field
          name="schoolYear"
          {...props}
          metadata={metadata}
          className="min-w-28"
        />
        Khóa học:{" "}
        <Field
          name="schoolAcademicYear"
          {...props}
          metadata={metadata}
          className="min-w-28"
        />
      </p>
      <p>
        MSSV:{" "}
        <Field
          name="schoolStudentId"
          {...props}
          metadata={metadata}
          className="min-w-fit"
        />
        <span> </span>
        Khoa:{" "}
        <Field
          name="schoolFacultyName"
          {...props}
          metadata={metadata}
          className="min-w-56"
        />
      </p>
      <p>
        Hệ đào tạo:{" "}
        <Field
          name="schoolTrainingType"
          {...props}
          metadata={metadata}
          className="min-w-fit"
        />
        của Trường Đại học Công nghệ Sài Gòn.
      </p>
      <Principal
        metadata={metadata}
        editable={props.editable}
        editScope={props.editScope}
        adminMode={props.adminMode}
        onChange={props.onChange}
      />
    </div>
  );
}

function Principal({
  metadata,
  editable,
  editScope,
  adminMode,
  onChange,
}: {
  metadata: Metadata;
  editable?: boolean;
  editScope?: "all" | "school";
  adminMode?: boolean;
  onChange?: (key: string, value: string) => void;
}) {
  return (
    <div className="certificate-principal">
      <p>
        TP. Hồ Chí Minh,{" "}
        <DateFields
          name="principalDate"
          metadata={metadata}
          editable={editable}
          editScope={editScope}
          adminMode={adminMode}
          onChange={onChange}
        />
      </p>
      <p className="mt-2 font-semibold uppercase">
        <Field
          name="principalTitle"
          metadata={metadata}
          editable={editable}
          editScope={editScope}
          onChange={onChange}
          className="min-w-36 text-center"
        />
      </p>
      <p className="certificate-sign-name">
        <Field
          name="principalName"
          metadata={metadata}
          editable={editable}
          editScope={editScope}
          onChange={onChange}
          className="min-w-44 text-center"
        />
      </p>
    </div>
  );
}

function CertificateDocument(props: CertificateDocumentProps) {
  const code = normalizeCertificateCode(props.formCode, props.formTypeName);

  if (code === "NVQS") return <NvqsForm {...props} />;
  if (code === "VAY_VON") return <LoanForm {...props} />;
  return <GeneralForm {...props} />;
}

export default CertificateDocument;
