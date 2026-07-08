import { CalendarDays, CheckCircle2, Download, Save, Search, ShieldCheck } from "lucide-react";
import Card from "../../../components/Card";
import DataTable, { type Column } from "../../../components/DataTable";
import FilterBar from "../../../components/FilterBar";
import FormField from "../../../components/FormField";
import PageHeader from "../../../components/PageHeader";
import StatCard from "../../../components/StatCard";
import UploadBox from "../../../components/UploadBox";
import {
  activities,
  adminStats,
  auditLogs,
  certificates,
  classes,
  discipline,
  exams,
  faculties,
  notifications,
  rewards,
  type ModuleMeta,
  type TableRow,
} from "../../../data/mockData";

type AdminModulePageProps = {
  meta: ModuleMeta;
  dataset?: TableRow[];
};

const defaultColumns: Column<TableRow>[] = [
  { header: "Tên/Mã", key: "title" },
  { header: "Thông tin", key: "target" },
  { header: "Trạng thái", key: "status" },
];

const datasetColumns = (rows: TableRow[]): Column<TableRow>[] => {
  const firstRow = rows[0];
  if (!firstRow) return defaultColumns;
  return Object.keys(firstRow).slice(0, 5).map((key) => ({
    header: key
      .replace("studentCode", "MSSV")
      .replace("className", "Lớp")
      .replace("createdAt", "Ngày gửi")
      .replace("status", "Trạng thái")
      .replace("title", "Tiêu đề")
      .replace("name", "Họ tên")
      .replace("code", "Mã")
      .replace("faculty", "Khoa"),
    key,
  })) as Column<TableRow>[];
};

const getDefaultDataset = (module: string) => {
  if (module === "Tổ chức") return module.includes("Lớp") ? classes : faculties;
  if (module === "Thông báo") return notifications;
  if (module === "Kỳ thi") return exams;
  if (module === "Hoạt động") return activities;
  if (module === "Đơn từ") return certificates;
  if (module === "Khen thưởng") return rewards;
  if (module === "Kỷ luật") return discipline;
  if (module === "Cài đặt") return auditLogs;
  return certificates;
};

function FormContent({ meta }: { meta: ModuleMeta }) {
  if (meta.title.includes("Import")) {
    return (
      <Card>
        <UploadBox />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card className="bg-surface-container-low">
            <p className="font-semibold text-on-surface">1. Tải template</p>
            <p className="mt-2 text-sm text-on-surface-variant">MSSV, họ tên, ngày sinh, giới tính, lớp.</p>
          </Card>
          <Card className="bg-surface-container-low">
            <p className="font-semibold text-on-surface">2. Validate dữ liệu</p>
            <p className="mt-2 text-sm text-on-surface-variant">Kiểm tra trùng MSSV và lớp tồn tại.</p>
          </Card>
          <Card className="bg-surface-container-low">
            <p className="font-semibold text-on-surface">3. Batch insert</p>
            <p className="mt-2 text-sm text-on-surface-variant">Tạo profile và account đăng nhập.</p>
          </Card>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="Tên / Tiêu đề" placeholder="Nhập nội dung chính" />
        <FormField as="select" label="Trạng thái" options={["ACTIVE", "DRAFT", "PUBLISHED", "PENDING"]} />
        <FormField label="Mã tham chiếu" placeholder="Ví dụ: CNTT, K64-CNPM, GXN-24001" />
        <FormField label="Ngày hiệu lực" type="date" />
        <FormField as="textarea" className="md:col-span-2" label="Mô tả chi tiết" placeholder="Nhập mô tả nghiệp vụ, ghi chú xử lý hoặc nội dung HTML..." />
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary" type="button">
          <Save className="h-5 w-5" />
          Lưu nháp
        </button>
        <button className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" type="button">
          <CheckCircle2 className="h-5 w-5" />
          Hoàn tất
        </button>
      </div>
    </Card>
  );
}

function DetailContent({ meta }: { meta: ModuleMeta }) {
  return (
    <section className="grid gap-gutter lg:grid-cols-[1.4fr_0.8fr]">
      <Card>
        <h2 className="text-xl font-bold text-on-surface">Thông tin chi tiết</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {["Mã hồ sơ", "Người phụ trách", "Ngày tạo", "Trạng thái", "Đơn vị liên quan", "Ghi chú"].map((item) => (
            <div key={item} className="rounded-lg bg-surface-container-low p-4">
              <p className="text-xs font-semibold uppercase text-on-surface-variant">{item}</p>
              <p className="mt-2 font-semibold text-on-surface">{item === "Trạng thái" ? "Đang xử lý" : "Dữ liệu mẫu"}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-on-surface-variant">
          Màn hình này dùng component chi tiết chung để hiển thị hồ sơ sinh viên, đơn xác nhận, hoạt động đăng ký hoặc hồ sơ khen thưởng/kỷ luật.
        </p>
      </Card>
      <Card>
        <h2 className="text-xl font-bold text-on-surface">Timeline xử lý</h2>
        <div className="mt-6 space-y-5">
          {["Tiếp nhận hồ sơ", "Kiểm tra điều kiện", "Chờ phê duyệt", "Hoàn tất"].map((step, index) => (
            <div key={step} className="flex gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary">
                {index + 1}
              </div>
              <div>
                <p className="font-semibold text-on-surface">{step}</p>
                <p className="text-sm text-on-surface-variant">Cập nhật bởi {meta.module} lúc 09:{index}0</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

function ReportContent() {
  return (
    <>
      <section className="grid gap-gutter md:grid-cols-2 xl:grid-cols-4">
        {adminStats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>
      <Card className="min-h-[380px]">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-on-surface">Biểu đồ thống kê</h2>
          <button className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 font-semibold text-primary" type="button">
            <Download className="h-4 w-4" />
            Xuất Excel
          </button>
        </div>
        <div className="mt-10 grid h-64 items-end gap-4 border-b border-l border-outline-variant px-4 md:grid-cols-6">
          {[42, 68, 54, 88, 73, 96].map((height, index) => (
            <div key={height} className="flex h-full flex-col justify-end gap-2">
              <div className="rounded-t-lg bg-primary" style={{ height: `${height}%` }} />
              <span className="text-center text-xs text-on-surface-variant">T{index + 1}</span>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function SettingsContent() {
  return (
    <Card>
      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="Tên hệ thống" defaultValue="Nền tảng Quản lý Công tác Sinh viên" />
        <FormField label="Email hỗ trợ" defaultValue="ctsv@stu.edu.vn" />
        <FormField as="select" label="Chế độ thông báo" options={["Email và web", "Chỉ web", "Tắt tạm thời"]} />
        <FormField as="select" label="Mức bảo mật" options={["Gateway JWT + Redis blacklist", "Gateway JWT", "Nội bộ"]} />
      </div>
      <div className="mt-6 flex items-center gap-3 rounded-lg bg-primary-fixed p-4 text-primary">
        <ShieldCheck className="h-5 w-5" />
        <span className="font-semibold">Một số trang là mock UI, chưa gọi API backend.</span>
      </div>
    </Card>
  );
}

function AdminModulePage({ meta, dataset }: AdminModulePageProps) {
  const rows = dataset ?? getDefaultDataset(meta.module);

  return (
    <>
      <PageHeader title={meta.title} subtitle={meta.subtitle} actionLabel={meta.actionLabel} />
      {meta.kind === "table" && (
        <>
          <FilterBar />
          <DataTable columns={datasetColumns(rows)} rows={rows} caption={meta.title} />
        </>
      )}
      {meta.kind === "form" && <FormContent meta={meta} />}
      {meta.kind === "detail" && <DetailContent meta={meta} />}
      {meta.kind === "report" && <ReportContent />}
      {meta.kind === "settings" && <SettingsContent />}
      {meta.kind === "dashboard" && (
        <Card>
          <div className="flex items-center gap-3 text-on-surface-variant">
            <Search className="h-5 w-5" />
            <span>{meta.title}</span>
          </div>
        </Card>
      )}
      <Card className="bg-surface-container-low">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary-fixed p-2 text-primary">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-on-surface">Module: {meta.module}</p>
            <p className="text-sm text-on-surface-variant">
              Component màn hình đang tái sử dụng layout, bảng, form, filter, badge và card chung.
            </p>
          </div>
        </div>
      </Card>
    </>
  );
}

export default AdminModulePage;
