import { Edit3, PlusCircle, RotateCcw, Save, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Card from "../../../components/Card";
import ExcelImportButton from "../../../components/ExcelImportButton";
import FilterBar from "../../../components/FilterBar";
import FormField from "../../../components/FormField";
import PageHeader from "../../../components/PageHeader";
import PaginationControls from "../../../components/PaginationControls";
import StatusBadge from "../../../components/StatusBadge";
import { usePaginatedList } from "../../../hooks/usePaginatedList";
import { facultyApi, type FacultyPayload, type FacultyResponse, type OrganizationStatus } from "../../../services/api";
import { includesSearch } from "../../../utils/search";
import { sortBySchoolCode } from "../../../utils/schoolCodeSort";
import { facultySchema } from "../../../validation/organizationSchemas";
import { getZodMessage } from "../../../validation/userSchemas";

const emptyFacultyForm: FacultyPayload = {
  facultyCode: "",
  facultyName: "",
  status: "ACTIVE",
};

const statusOptions: OrganizationStatus[] = ["ACTIVE", "INACTIVE"];

function FacultyManagementPage() {
  const [faculties, setFaculties] = useState<FacultyResponse[]>([]);
  const [formData, setFormData] = useState<FacultyPayload>(emptyFacultyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadFaculties = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const data = await facultyApi.list();
      setFaculties(sortBySchoolCode(data, (faculty) => faculty.facultyCode));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không tải được danh sách khoa.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadFaculties();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadFaculties]);

  const updateField = (field: keyof FacultyPayload, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setFormData(emptyFacultyForm);
    setEditingId(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const payload = facultySchema.parse({
        facultyCode: formData.facultyCode.trim(),
        facultyName: formData.facultyName.trim(),
        status: formData.status,
      });

      if (editingId) {
        const updated = await facultyApi.update(editingId, payload);
        setFaculties((current) => sortBySchoolCode(
          current.map((faculty) => (faculty.id === updated.id ? updated : faculty)),
          (faculty) => faculty.facultyCode,
        ));
        setMessage("Đã cập nhật khoa.");
      } else {
        const created = await facultyApi.create(payload);
        setFaculties((current) => sortBySchoolCode([...current, created], (faculty) => faculty.facultyCode));
        setMessage("Đã thêm khoa mới.");
      }

      resetForm();
    } catch (err) {
      setMessage(getZodMessage(err, err instanceof Error ? err.message : "Không lưu được khoa."));
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    setMessage("");

    try {
      const result = await facultyApi.importExcel(file);
      await loadFaculties();
      setMessage(result || "Đã import khoa từ Excel.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không import được danh sách khoa.");
    } finally {
      setImporting(false);
    }
  };

  const startEdit = (faculty: FacultyResponse) => {
    setEditingId(faculty.id);
    setFormData({
      facultyCode: faculty.facultyCode,
      facultyName: faculty.facultyName,
      status: faculty.status,
    });
  };

  const handleDelete = async (faculty: FacultyResponse) => {
    if (!window.confirm(`Xóa khoa ${faculty.facultyName}?`)) return;

    setMessage("");
    try {
      await facultyApi.remove(faculty.id);
      setFaculties((current) => current.filter((item) => item.id !== faculty.id));
      if (editingId === faculty.id) resetForm();
      setMessage("Đã xóa khoa.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không xóa được khoa.");
    }
  };

  const filteredFaculties = useMemo(() => {
    const status = statusFilter as OrganizationStatus | "";
    return faculties.filter((faculty) => (
      includesSearch(`${faculty.facultyCode} ${faculty.facultyName}`, keyword)
      && (!status || faculty.status === status)
    ));
  }, [faculties, keyword, statusFilter]);

  const {
    pageItems: paginatedFaculties,
    pageIndex,
    pageSize,
    totalItems,
    setPageIndex,
    setPageSize,
  } = usePaginatedList(filteredFaculties);

  return (
    <div className="space-y-gutter">
      <PageHeader
        title="Quản lý khoa"
        subtitle="Tạo, cập nhật và import danh mục khoa để phân lớp, lọc thông báo và quản lý hồ sơ sinh viên."
      />

      {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">{message}</div>}

      <FilterBar
        filters={[
          {
            id: "status",
            label: "Trạng thái",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "", label: "Tất cả trạng thái" },
              { value: "ACTIVE", label: "Hoạt động" },
              { value: "INACTIVE", label: "Ngưng hoạt động" },
            ],
          },
        ]}
        onReset={() => {
          setKeyword("");
          setStatusFilter("");
        }}
        onSearchChange={setKeyword}
        resultText={`Hiển thị ${filteredFaculties.length} / ${faculties.length} khoa`}
        searchPlaceholder="Nhập mã khoa hoặc tên khoa"
        searchValue={keyword}
        title="Lọc danh sách khoa"
      />

      <Card>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-primary">{editingId ? "Cập nhật khoa" : "Thêm khoa mới"}</p>
            <h2 className="text-xl font-bold text-on-surface">Thông tin khoa</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <ExcelImportButton loading={importing} onImport={handleImport} />
            <button className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" onClick={loadFaculties} type="button">
              <RotateCcw className="h-5 w-5" />
              Tải lại
            </button>
          </div>
        </div>

        <form className="grid gap-4 md:grid-cols-[0.8fr_1.6fr_0.8fr_auto]" onSubmit={handleSubmit}>
          <FormField label="Mã khoa" onChange={(event) => updateField("facultyCode", event.target.value)} required value={formData.facultyCode} />
          <FormField label="Tên khoa" onChange={(event) => updateField("facultyName", event.target.value)} required value={formData.facultyName} />
          <FormField
            as="select"
            label="Trạng thái"
            onChange={(event) => updateField("status", event.target.value)}
            options={statusOptions}
            value={formData.status}
          />
          <div className="mt-auto flex gap-2">
            <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary disabled:opacity-60" disabled={saving} type="submit">
              {editingId ? <Save className="h-5 w-5" /> : <PlusCircle className="h-5 w-5" />}
              {saving ? "Đang lưu" : editingId ? "Cập nhật" : "Thêm"}
            </button>
            {editingId && (
              <button className="rounded-lg border border-outline-variant p-3 text-primary" onClick={resetForm} type="button">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-outline-variant px-5 py-4">
          <h2 className="text-lg font-semibold text-on-surface">Danh sách khoa</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-5 py-4 font-semibold text-on-surface">Mã khoa</th>
                <th className="px-5 py-4 font-semibold text-on-surface">Tên khoa</th>
                <th className="px-5 py-4 font-semibold text-on-surface">Lớp</th>
                <th className="px-5 py-4 font-semibold text-on-surface">Sinh viên</th>
                <th className="px-5 py-4 font-semibold text-on-surface">Trạng thái</th>
                <th className="px-5 py-4 text-right font-semibold text-on-surface">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedFaculties.map((faculty) => (
                <tr key={faculty.id} className="border-t border-outline-variant">
                  <td className="px-5 py-4 font-bold text-on-surface">{faculty.facultyCode}</td>
                  <td className="px-5 py-4 text-on-surface-variant">{faculty.facultyName}</td>
                  <td className="px-5 py-4 text-on-surface-variant">{faculty.classCount ?? 0}</td>
                  <td className="px-5 py-4 text-on-surface-variant">{faculty.studentCount ?? 0}</td>
                  <td className="px-5 py-4"><StatusBadge status={faculty.status} /></td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button className="rounded-lg p-2 text-primary hover:bg-surface-container" onClick={() => startEdit(faculty)} type="button">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button className="rounded-lg p-2 text-error hover:bg-error-container" onClick={() => void handleDelete(faculty)} type="button">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filteredFaculties.length === 0 && <p className="px-5 py-6 text-sm text-on-surface-variant">Không tìm thấy khoa phù hợp.</p>}
          {loading && <p className="px-5 py-6 text-sm text-on-surface-variant">Đang tải danh sách khoa...</p>}
        </div>
        {!loading && filteredFaculties.length > 0 && (
          <PaginationControls
            itemLabel="khoa"
            onPageChange={setPageIndex}
            onPageSizeChange={setPageSize}
            pageIndex={pageIndex}
            pageSize={pageSize}
            totalItems={totalItems}
          />
        )}
      </Card>
    </div>
  );
}

export default FacultyManagementPage;
