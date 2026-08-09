import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import DataTable, { type Column } from "../../../components/DataTable";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import type { TableRow } from "../../../data/mockData";
import { formTypeApi, type FormType } from "../../../services/api";

type FormTypeRow = TableRow & {
  id: string;
  name: string;
  formCode: string;
  description: string;
  isActive: string;
};

const defaultFormCodes = ["NVQS", "KHAC", "VAY_VON"];

const toRow = (item: FormType): FormTypeRow => ({
  id: String(item.id),
  name: item.name,
  formCode: item.formCode || "",
  description: item.description || "",
  isActive: item.isActive ? "ACTIVE" : "INACTIVE",
});

const columns: Column<FormTypeRow>[] = [
  { header: "Tên loại đơn", key: "name" },
  { header: "Mã loại đơn", key: "formCode" },
  { header: "Mô tả", key: "description" },
  {
    header: "Trạng thái",
    key: "isActive",
    render: (row) => <StatusBadge status={row.isActive === "ACTIVE" ? "ACTIVE" : "INACTIVE"} />,
  },
];

function AdminFormTypesPage() {
  const [formTypes, setFormTypes] = useState<FormType[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadFormTypes = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const data = await formTypeApi.listAll();
      setFormTypes(data);
    } catch (err) {
      setFormTypes([]);
      setMessage(err instanceof Error ? err.message : "Không tải được danh sách loại đơn.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadFormTypes();
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [loadFormTypes]);

  const rows = useMemo(
    () =>
      formTypes
        .filter((item) => defaultFormCodes.includes(item.formCode || item.name))
        .sort((a, b) => defaultFormCodes.indexOf(a.formCode || a.name) - defaultFormCodes.indexOf(b.formCode || b.name))
        .map(toRow),
    [formTypes],
  );

  return (
    <div className="space-y-gutter">
      <BackButton to="/admin/certificates">Quay lại đơn từ</BackButton>

      <PageHeader
        title="Loại đơn mặc định"
        subtitle="Hệ thống chỉ sử dụng 3 loại đơn cố định: NVQS, KHAC và VAY_VON."
      />

      <div className="flex flex-wrap gap-3">
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary"
          onClick={loadFormTypes}
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

      {loading ? (
        <div className="panel p-6 text-on-surface-variant">Đang tải danh sách...</div>
      ) : (
        <DataTable
          actions={() => <span className="text-sm font-semibold text-on-surface-variant">Cố định</span>}
          caption="Danh sách loại đơn đang sử dụng"
          columns={columns}
          itemLabel="loại đơn"
          rows={rows}
          selectable={false}
        />
      )}
    </div>
  );
}

export default AdminFormTypesPage;
