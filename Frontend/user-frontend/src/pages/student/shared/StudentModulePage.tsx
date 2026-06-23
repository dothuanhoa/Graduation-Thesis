import { CheckCircle2, FileText, Info, ListChecks } from "lucide-react";
import Card from "../../../components/Card";
import DataTable, { type Column } from "../../../components/DataTable";
import FormField from "../../../components/FormField";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import type { ModuleMeta, TableRow } from "../../../data/mockData";

type StudentModulePageProps = {
  meta: ModuleMeta;
  rows?: TableRow[];
};

const columns: Column<TableRow>[] = [
  { header: "Nội dung", key: "title" },
  { header: "Thông tin", key: "time" },
  { header: "Trạng thái", key: "status" },
];

function StudentModulePage({ meta, rows = [] }: StudentModulePageProps) {
  return (
    <div className="space-y-gutter">
      <PageHeader title={meta.title} subtitle={meta.subtitle} />

      {meta.kind === "table" && <DataTable columns={columns} rows={rows} caption={meta.title} />}

      {meta.kind === "form" && (
        <Card>
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Loại yêu cầu" placeholder="Chọn loại giấy xác nhận" />
            <FormField label="Số điện thoại liên hệ" placeholder="090..." />
            <div className="md:col-span-2">
              <FormField as="textarea" label="Mục đích sử dụng" placeholder="Nhập mục đích sử dụng..." />
            </div>
          </div>
          <button className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary" type="button">
            Gửi yêu cầu
          </button>
        </Card>
      )}

      {meta.kind === "detail" && (
        <section className="grid gap-gutter lg:grid-cols-[1fr_340px]">
          <Card>
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-primary-fixed p-3 text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">{meta.module}</p>
                <h2 className="mt-1 text-xl font-bold text-on-surface">Nội dung chi tiết</h2>
                <p className="mt-3 leading-7 text-on-surface-variant">
                  Màn hình này hiển thị thông tin chi tiết cho thông báo, hoạt động, hướng dẫn thi hoặc yêu cầu giấy xác nhận.
                  Khi backend module tương ứng hoàn thiện, dữ liệu thật sẽ được nạp theo mã trên URL.
                </p>
                <div className="mt-5">
                  <StatusBadge status="PUBLISHED" />
                </div>
              </div>
            </div>
          </Card>
          <Card>
            <h2 className="flex items-center gap-2 text-lg font-bold text-on-surface">
              <Info className="h-5 w-5 text-primary" />
              Ghi chú xử lý
            </h2>
            <div className="mt-4 space-y-3 text-sm text-on-surface-variant">
              <p>Kiểm tra thời hạn thực hiện trước khi gửi yêu cầu.</p>
              <p>Lưu lại minh chứng nếu thông báo yêu cầu nộp bổ sung.</p>
            </div>
          </Card>
        </section>
      )}

      {meta.kind === "report" && (
        <section className="grid gap-gutter lg:grid-cols-[1fr_340px]">
          <Card>
            <div className="flex items-center gap-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-primary">Kết quả đã ghi nhận</p>
                <h2 className="text-2xl font-bold text-on-surface">8.5 / 10</h2>
                <p className="mt-1 text-on-surface-variant">Bạn đã hoàn thành kỳ thi và kết quả đã được lưu vào hồ sơ.</p>
              </div>
            </div>
          </Card>
          <Card>
            <h2 className="flex items-center gap-2 text-lg font-bold text-on-surface">
              <ListChecks className="h-5 w-5 text-primary" />
              Tóm tắt
            </h2>
            <div className="mt-4 space-y-3 text-sm text-on-surface-variant">
              <p>Số câu đúng: 26/30</p>
              <p>Thời gian làm bài: 24 phút</p>
              <p>Lượt thi: 1/1</p>
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}

export default StudentModulePage;
