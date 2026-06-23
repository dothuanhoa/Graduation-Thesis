import { FilePlus2, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import Card from "../../../components/Card";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import { studentCertificates } from "../../../data/studentPortalData";

function StudentCertificatesPage() {
  return (
    <div className="space-y-gutter">
      <PageHeader
        title="Đơn xác nhận"
        subtitle="Theo dõi giấy xác nhận đã gửi, lịch hẹn nhận kết quả và trạng thái xử lý."
      />

      <div className="flex justify-end">
        <Link className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary" to="/student/certificates/new">
          <FilePlus2 className="h-5 w-5" />
          Tạo yêu cầu mới
        </Link>
      </div>

      <div className="grid gap-gutter">
        {studentCertificates.map((certificate) => (
          <Card key={certificate.id}>
            <div className="grid gap-5 md:grid-cols-[auto_1fr_auto] md:items-center">
              <div className="rounded-lg bg-primary-fixed p-3 text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-bold text-on-surface">{certificate.type}</h2>
                  <StatusBadge status={certificate.status} />
                </div>
                <p className="text-sm text-on-surface-variant">
                  Mã đơn {certificate.code} · Gửi ngày {certificate.createdAt} · Lịch hẹn {certificate.appointment}
                </p>
              </div>
              <button className="rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" type="button">
                Xem chi tiết
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default StudentCertificatesPage;
