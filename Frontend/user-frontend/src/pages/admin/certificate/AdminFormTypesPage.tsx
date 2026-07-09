import { Edit3, Plus, RefreshCw, RotateCcw, Save, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Card from "../../../components/Card";
import DataTable, { type Column } from "../../../components/DataTable";
import FormField from "../../../components/FormField";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import type { TableRow } from "../../../data/mockData";
import { formTypeApi, type FormType, type FormTypePayload } from "../../../services/api";

type FormTypeRow = TableRow & {
  id: string;
  name: string;
  formCode: string;
  description: string;
  isActive: string;
  createdAt: string;
};

const toRow = (item: FormType): FormTypeRow => ({
  id: String(item.id),
  name: item.name,
  formCode: item.formCode || "",
  description: item.description || "",
  isActive: item.isActive ? "Hoạt động" : "Ngừng hoạt động",
  createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "",
});

const columns: Column<FormTypeRow>[] = [
  { header: "Tên biểu mẫu", key: "name" },
  { header: "Mã biểu mẫu (Code)", key: "formCode" },
  { header: "Mô tả", key: "description" },
  { header: "Trạng thái", key: "isActive", render: (row) => <StatusBadge status={row.isActive === "Hoạt động" ? "ACTIVE" : "INACTIVE"} /> },
  { header: "Ngày tạo", key: "createdAt" },
];

function AdminFormTypesPage() {
  const [formTypes, setFormTypes] = useState<FormType[]>([]);
  const [editing, setEditing] = useState<FormType | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<FormTypePayload>({ name: "", formCode: "", description: "", isActive: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadFormTypes = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const data = await formTypeApi.listAll();
      setFormTypes(data);
    } catch (err) {
      setFormTypes([]);
      setMessage(err instanceof Error ? err.message : "Không tải được danh sách loại biểu mẫu.");
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

  const startCreate = () => {
    setEditing(null);
    setIsCreating(true);
    setFormData({ name: "", formCode: "", description: "", isActive: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startEdit = (row: FormTypeRow) => {
    const item = formTypes.find((ft) => String(ft.id) === row.id);
    if (!item) return;
    setEditing(item);
    setIsCreating(false);
    setFormData({ name: item.name, formCode: item.formCode || "", description: item.description || "", isActive: item.isActive });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditing(null);
    setIsCreating(false);
    setFormData({ name: "", formCode: "", description: "", isActive: true });
  };

  const updateField = (field: keyof FormTypePayload, value: string | boolean) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.name.trim()) {
      setMessage("Vui lòng nhập tên biểu mẫu.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      if (editing) {
        const updated = await formTypeApi.update(editing.id, formData);
        setFormTypes((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        setMessage("Đã cập nhật loại biểu mẫu.");
      } else {
        const created = await formTypeApi.create(formData);
        setFormTypes((current) => [...current, created]);
        setMessage("Đã tạo loại biểu mẫu mới.");
      }
      cancelEdit();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không lưu được loại biểu mẫu.");
    } finally {
      setSaving(false);
    }
  };

  const removeFormType = async (row: FormTypeRow) => {
    if (!window.confirm(`Xóa biểu mẫu "${row.name}"? Hành động này không thể hoàn tác.`)) return;

    setMessage("");
    try {
      await formTypeApi.remove(row.id);
      setFormTypes((current) => current.filter((item) => String(item.id) !== row.id));
      setMessage("Đã xóa loại biểu mẫu.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không xóa được loại biểu mẫu. Có thể biểu mẫu này đang được sử dụng.");
    }
  };

  const rows = formTypes.map(toRow);

  return (
    <div className="space-y-gutter">
      <PageHeader
        title="Quản lý Loại biểu mẫu"
        subtitle="Thêm, sửa, xóa các loại biểu mẫu dùng cho việc cấp chứng nhận / xác nhận."
      />

      <div className="flex flex-wrap gap-3">
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary" onClick={startCreate} type="button">
          <Plus className="h-5 w-5" />
          Thêm biểu mẫu
        </button>
        <button className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" onClick={loadFormTypes} type="button">
          <RefreshCw className="h-5 w-5" />
          Tải lại
        </button>
      </div>

      {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">{message}</div>}

      {(isCreating || editing) && (
        <Card>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary">{isCreating ? "Thêm biểu mẫu mới" : "Chỉnh sửa biểu mẫu"}</p>
              <h2 className="text-xl font-bold text-on-surface">{isCreating ? "Biểu mẫu mới" : editing?.name}</h2>
            </div>
            <button className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container" onClick={cancelEdit} type="button">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form className="grid gap-5 md:grid-cols-2" onSubmit={handleSave}>
            <FormField label="Tên biểu mẫu" onChange={(event) => updateField("name", event.target.value)} required value={formData.name} />
            <FormField label="Mã biểu mẫu (tùy chọn)" onChange={(event) => updateField("formCode", event.target.value)} value={formData.formCode || ""} placeholder="VD: DON_XIN_1, GIAY_VAY_VON" />
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-on-surface-variant">Trạng thái</label>
              <select 
                className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={formData.isActive ? "true" : "false"}
                onChange={(event) => updateField("isActive", event.target.value === "true")}
              >
                <option value="true">Hoạt động</option>
                <option value="false">Ngừng hoạt động</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <FormField as="textarea" label="Mô tả" onChange={(event) => updateField("description", event.target.value)} value={formData.description} />
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary disabled:opacity-60" disabled={saving} type="submit">
                <Save className="h-5 w-5" />
                {saving ? "Đang lưu" : "Lưu thay đổi"}
              </button>
              <button className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" onClick={cancelEdit} type="button">
                <RotateCcw className="h-5 w-5" />
                Hủy
              </button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="panel p-6 text-on-surface-variant">Đang tải danh sách...</div>
      ) : (
        <DataTable
          actions={(row) => (
            <div className="flex justify-end gap-2">
              <button className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-primary hover:bg-surface-container" onClick={() => startEdit(row)} type="button">
                <Edit3 className="h-4 w-4" />
                Sửa
              </button>
              <button className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-error hover:bg-error-container" onClick={() => void removeFormType(row)} type="button">
                <Trash2 className="h-4 w-4" />
                Xóa
              </button>
            </div>
          )}
          caption="Danh sách loại biểu mẫu chứng nhận"
          columns={columns}
          rows={rows}
        />
      )}
    </div>
  );
}

export default AdminFormTypesPage;
