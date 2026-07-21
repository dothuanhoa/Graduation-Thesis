import { Edit3, PlusCircle, RotateCcw, Save, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Card from "../../../components/Card";
import ExcelImportButton from "../../../components/ExcelImportButton";
import FilterBar from "../../../components/FilterBar";
import FormField from "../../../components/FormField";
import PageHeader from "../../../components/PageHeader";
import PaginationControls from "../../../components/PaginationControls";
import { usePaginatedList } from "../../../hooks/usePaginatedList";
import { academicYearApi, type AcademicYearPayload, type AcademicYearResponse } from "../../../services/api";
import { includesSearch } from "../../../utils/search";
import { sortBySchoolCode } from "../../../utils/schoolCodeSort";
import { academicYearSchema } from "../../../validation/organizationSchemas";
import { getZodMessage } from "../../../validation/userSchemas";

type AcademicYearFormState = {
  yearName: string;
  startYear: string;
};

const emptyAcademicYearForm: AcademicYearFormState = {
  yearName: "",
  startYear: "",
};

function AcademicYearManagementPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYearResponse[]>([]);
  const [formData, setFormData] = useState<AcademicYearFormState>(emptyAcademicYearForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [keyword, setKeyword] = useState("");
  const [startYearFilter, setStartYearFilter] = useState("");

  const loadAcademicYears = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const data = await academicYearApi.list();
      setAcademicYears(sortBySchoolCode(data, (year) => year.yearName));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không tải được danh sách niên khóa.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadAcademicYears();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadAcademicYears]);

  const updateField = (field: keyof AcademicYearFormState, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setFormData(emptyAcademicYearForm);
    setEditingId(null);
  };

  const toPayload = (): AcademicYearPayload =>
    academicYearSchema.parse({
      yearName: formData.yearName.trim(),
      startYear: formData.startYear.trim() ? Number(formData.startYear) : undefined,
    });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const payload = toPayload();
      if (editingId) {
        const updated = await academicYearApi.update(editingId, payload);
        setAcademicYears((current) => sortBySchoolCode(
          current.map((year) => (year.id === updated.id ? updated : year)),
          (year) => year.yearName,
        ));
        setMessage("Đã cập nhật niên khóa.");
      } else {
        const created = await academicYearApi.create(payload);
        setAcademicYears((current) => sortBySchoolCode([created, ...current], (year) => year.yearName));
        setMessage("Đã thêm niên khóa mới.");
      }

      resetForm();
    } catch (err) {
      setMessage(getZodMessage(err, err instanceof Error ? err.message : "Không lưu được niên khóa."));
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    setMessage("");

    try {
      const result = await academicYearApi.importExcel(file);
      await loadAcademicYears();
      setMessage(result || "Đã import niên khóa từ Excel.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không import được danh sách niên khóa.");
    } finally {
      setImporting(false);
    }
  };

  const startEdit = (academicYear: AcademicYearResponse) => {
    setEditingId(academicYear.id);
    setFormData({
      yearName: academicYear.yearName,
      startYear: academicYear.startYear ? String(academicYear.startYear) : "",
    });
  };

  const handleDelete = async (academicYear: AcademicYearResponse) => {
    if (!window.confirm(`Xóa niên khóa ${academicYear.yearName}?`)) return;

    setMessage("");
    try {
      await academicYearApi.remove(academicYear.id);
      setAcademicYears((current) => current.filter((item) => item.id !== academicYear.id));
      if (editingId === academicYear.id) resetForm();
      setMessage("Đã xóa niên khóa.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không xóa được niên khóa.");
    }
  };

  const startYearOptions = useMemo(
    () =>
      Array.from(new Set(academicYears.map((year) => year.startYear).filter(Boolean) as number[]))
        .sort((a, b) => a - b)
        .map((year) => ({ value: String(year), label: String(year) })),
    [academicYears],
  );

  const filteredAcademicYears = useMemo(() => {
    return academicYears.filter((academicYear) => (
      includesSearch(`${academicYear.yearName} ${academicYear.startYear ?? ""}`, keyword)
      && (!startYearFilter || String(academicYear.startYear ?? "") === startYearFilter)
    ));
  }, [academicYears, keyword, startYearFilter]);

  const {
    pageItems: paginatedAcademicYears,
    pageIndex,
    pageSize,
    totalItems,
    setPageIndex,
    setPageSize,
  } = usePaginatedList(filteredAcademicYears);

  return (
    <div className="space-y-gutter">
      <PageHeader
        title="Quản lý niên khóa"
        subtitle="Tạo, cập nhật và import niên khóa để gắn với lớp học, khóa tuyển sinh và hồ sơ sinh viên."
      />

      {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">{message}</div>}

      <FilterBar
        filters={[
          {
            id: "startYear",
            label: "Năm bắt đầu",
            value: startYearFilter,
            onChange: setStartYearFilter,
            options: [
              { value: "", label: "Tất cả năm" },
              ...startYearOptions,
            ],
          },
        ]}
        onReset={() => {
          setKeyword("");
          setStartYearFilter("");
        }}
        onSearchChange={setKeyword}
        resultText={`Hiển thị ${filteredAcademicYears.length} / ${academicYears.length} niên khóa`}
        searchPlaceholder="Nhập tên niên khóa hoặc năm bắt đầu"
        searchValue={keyword}
        title="Lọc danh sách niên khóa"
      />

      <Card>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-primary">{editingId ? "Cập nhật niên khóa" : "Thêm niên khóa mới"}</p>
            <h2 className="text-xl font-bold text-on-surface">Thông tin niên khóa</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <ExcelImportButton loading={importing} onImport={handleImport} />
            <button className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" onClick={loadAcademicYears} type="button">
              <RotateCcw className="h-5 w-5" />
              Tải lại
            </button>
          </div>
        </div>

        <form className="grid items-start gap-4 md:grid-cols-[1.4fr_0.8fr_auto]" onSubmit={handleSubmit}>
          <FormField
            hint="Ví dụ: 2021-2025 hoặc K21"
            label="Tên niên khóa"
            onChange={(event) => updateField("yearName", event.target.value)}
            required
            value={formData.yearName}
          />
          <FormField
            label="Năm bắt đầu"
            min={1900}
            max={2100}
            onChange={(event) => updateField("startYear", event.target.value)}
            required
            type="number"
            value={formData.startYear}
          />
          <div className="flex gap-2 md:pt-[1.625rem]">
            <button className="inline-flex h-[46px] items-center justify-center gap-2 rounded-lg bg-primary px-5 font-semibold text-on-primary disabled:opacity-60" disabled={saving} type="submit">
              {editingId ? <Save className="h-5 w-5" /> : <PlusCircle className="h-5 w-5" />}
              {saving ? "Đang lưu" : editingId ? "Cập nhật" : "Thêm"}
            </button>
            {editingId && (
              <button className="inline-flex h-[46px] w-[46px] items-center justify-center rounded-lg border border-outline-variant text-primary" onClick={resetForm} type="button">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-outline-variant px-5 py-4">
          <h2 className="text-lg font-semibold text-on-surface">Danh sách niên khóa</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-left text-sm">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-5 py-4 font-semibold text-on-surface">Tên niên khóa</th>
                <th className="px-5 py-4 font-semibold text-on-surface">Năm bắt đầu</th>
                <th className="px-5 py-4 font-semibold text-on-surface">Số lớp</th>
                <th className="px-5 py-4 text-right font-semibold text-on-surface">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAcademicYears.map((academicYear) => (
                <tr key={academicYear.id} className="border-t border-outline-variant">
                  <td className="px-5 py-4 font-bold text-on-surface">{academicYear.yearName}</td>
                  <td className="px-5 py-4 text-on-surface-variant">{academicYear.startYear || "-"}</td>
                  <td className="px-5 py-4 text-on-surface-variant">{academicYear.classCount ?? 0}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button className="rounded-lg p-2 text-primary hover:bg-surface-container" onClick={() => startEdit(academicYear)} type="button">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button className="rounded-lg p-2 text-error hover:bg-error-container" onClick={() => void handleDelete(academicYear)} type="button">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filteredAcademicYears.length === 0 && <p className="px-5 py-6 text-sm text-on-surface-variant">Không tìm thấy niên khóa phù hợp.</p>}
          {loading && <p className="px-5 py-6 text-sm text-on-surface-variant">Đang tải danh sách niên khóa...</p>}
        </div>
        {!loading && filteredAcademicYears.length > 0 && (
          <PaginationControls
            itemLabel="niên khóa"
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

export default AcademicYearManagementPage;
