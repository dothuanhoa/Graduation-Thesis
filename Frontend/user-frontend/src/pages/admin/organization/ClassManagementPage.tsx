import { Edit3, PlusCircle, RotateCcw, Save, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Card from "../../../components/Card";
import FormField from "../../../components/FormField";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import {
  academicYearApi,
  classApi,
  facultyApi,
  type AcademicYearResponse,
  type ClassPayload,
  type ClassResponse,
  type FacultyResponse,
  type OrganizationStatus,
} from "../../../services/api";
import { classSchema } from "../../../validation/organizationSchemas";
import { getZodMessage } from "../../../validation/userSchemas";

type ClassFormState = {
  classCode: string;
  facultyId: string;
  academicYearId: string;
  academicYearName: string;
  startYear: string;
  status: OrganizationStatus;
};

const emptyClassForm: ClassFormState = {
  classCode: "",
  facultyId: "",
  academicYearId: "",
  academicYearName: "",
  startYear: "",
  status: "ACTIVE",
};

const statusOptions: OrganizationStatus[] = ["ACTIVE", "INACTIVE"];

function ClassManagementPage() {
  const [classes, setClasses] = useState<ClassResponse[]>([]);
  const [faculties, setFaculties] = useState<FacultyResponse[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearResponse[]>([]);
  const [formData, setFormData] = useState<ClassFormState>(emptyClassForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const [classData, facultyData, academicYearData] = await Promise.all([
        classApi.list(),
        facultyApi.list(),
        academicYearApi.list(),
      ]);
      setClasses(classData);
      setFaculties(facultyData);
      setAcademicYears(academicYearData);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không tải được dữ liệu lớp.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadData]);

  const updateField = (field: keyof ClassFormState, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setFormData(emptyClassForm);
    setEditingId(null);
  };

  const toPayload = (): ClassPayload => {
    const academicYearId = formData.academicYearId || undefined;
    return {
      classCode: formData.classCode.trim(),
      facultyId: formData.facultyId,
      academicYearId,
      academicYearName: academicYearId ? undefined : formData.academicYearName.trim() || undefined,
      startYear: academicYearId || !formData.startYear ? undefined : Number(formData.startYear),
      status: formData.status,
    };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.facultyId) {
      setMessage("Vui lòng chọn khoa cho lớp.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const payload = classSchema.parse(toPayload());
      if (editingId) {
        const updated = await classApi.update(editingId, payload);
        setClasses((current) => current.map((clazz) => (clazz.id === updated.id ? updated : clazz)));
        setMessage("Đã cập nhật lớp.");
      } else {
        const created = await classApi.create(payload);
        setClasses((current) => [...current, created].sort((a, b) => a.classCode.localeCompare(b.classCode)));
        setMessage("Đã thêm lớp mới.");
      }

      const yearData = await academicYearApi.list();
      setAcademicYears(yearData);
      resetForm();
    } catch (err) {
      setMessage(getZodMessage(err, err instanceof Error ? err.message : "Không lưu được lớp."));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (clazz: ClassResponse) => {
    setEditingId(clazz.id);
    setFormData({
      classCode: clazz.classCode,
      facultyId: clazz.faculty?.id ? String(clazz.faculty.id) : "",
      academicYearId: clazz.academicYear?.id || "",
      academicYearName: clazz.academicYear?.id ? "" : clazz.academicYear?.yearName || "",
      startYear: clazz.academicYear?.startYear ? String(clazz.academicYear.startYear) : "",
      status: clazz.status,
    });
  };

  const handleDelete = async (clazz: ClassResponse) => {
    if (!window.confirm(`Xóa lớp ${clazz.classCode}?`)) return;

    setMessage("");
    try {
      await classApi.remove(clazz.id);
      setClasses((current) => current.filter((item) => item.id !== clazz.id));
      if (editingId === clazz.id) resetForm();
      setMessage("Đã xóa lớp.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không xóa được lớp.");
    }
  };

  return (
    <div className="space-y-gutter">
      <PageHeader
        title="Quản lý lớp"
        subtitle="Tạo lớp theo khoa và niên khóa để phân hồ sơ sinh viên, lọc thông báo và thống kê dữ liệu."
      />

      {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">{message}</div>}

      <Card>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-primary">{editingId ? "Cập nhật lớp" : "Thêm lớp mới"}</p>
            <h2 className="text-xl font-bold text-on-surface">Thông tin lớp</h2>
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" onClick={loadData} type="button">
            <RotateCcw className="h-5 w-5" />
            Tải lại
          </button>
        </div>

        <form className="grid gap-4 lg:grid-cols-[0.9fr_1.2fr_1.2fr_0.8fr_auto]" onSubmit={handleSubmit}>
          <FormField label="Mã lớp" onChange={(event) => updateField("classCode", event.target.value)} required value={formData.classCode} />

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">Khoa</span>
            <select
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface focus-ring"
              onChange={(event) => updateField("facultyId", event.target.value)}
              required
              value={formData.facultyId}
            >
              <option value="">Chọn khoa</option>
              {faculties.map((faculty) => (
                <option key={faculty.id} value={faculty.id}>
                  {faculty.facultyCode} - {faculty.facultyName}{faculty.status === "INACTIVE" ? " (ngưng hoạt động)" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">Niên khóa có sẵn</span>
            <select
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface focus-ring"
              onChange={(event) => updateField("academicYearId", event.target.value)}
              value={formData.academicYearId}
            >
              <option value="">Tạo mới hoặc để trống</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.yearName}
                </option>
              ))}
            </select>
          </label>

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

          <FormField
            disabled={Boolean(formData.academicYearId)}
            hint="Nhập khi chưa chọn niên khóa có sẵn."
            label="Tên niên khóa mới"
            onChange={(event) => updateField("academicYearName", event.target.value)}
            value={formData.academicYearName}
          />
          <FormField
            disabled={Boolean(formData.academicYearId)}
            label="Năm bắt đầu"
            max={2100}
            min={1900}
            onChange={(event) => updateField("startYear", event.target.value)}
            type="number"
            value={formData.startYear}
          />
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-outline-variant px-5 py-4">
          <h2 className="text-lg font-semibold text-on-surface">Danh sách lớp</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-5 py-4 font-semibold text-on-surface">Mã lớp</th>
                <th className="px-5 py-4 font-semibold text-on-surface">Khoa</th>
                <th className="px-5 py-4 font-semibold text-on-surface">Niên khóa</th>
                <th className="px-5 py-4 font-semibold text-on-surface">Sinh viên</th>
                <th className="px-5 py-4 font-semibold text-on-surface">Trạng thái</th>
                <th className="px-5 py-4 text-right font-semibold text-on-surface">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((clazz) => (
                <tr key={clazz.id} className="border-t border-outline-variant">
                  <td className="px-5 py-4 font-bold text-on-surface">{clazz.classCode}</td>
                  <td className="px-5 py-4 text-on-surface-variant">
                    {clazz.faculty ? `${clazz.faculty.facultyCode} - ${clazz.faculty.facultyName}` : "Chưa chọn khoa"}
                  </td>
                  <td className="px-5 py-4 text-on-surface-variant">{clazz.academicYear?.yearName || "Chưa có"}</td>
                  <td className="px-5 py-4 text-on-surface-variant">{clazz.studentCount ?? 0}</td>
                  <td className="px-5 py-4"><StatusBadge status={clazz.status} /></td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button className="rounded-lg p-2 text-primary hover:bg-surface-container" onClick={() => startEdit(clazz)} type="button">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button className="rounded-lg p-2 text-error hover:bg-error-container" onClick={() => void handleDelete(clazz)} type="button">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && classes.length === 0 && <p className="px-5 py-6 text-sm text-on-surface-variant">Chưa có lớp nào.</p>}
          {loading && <p className="px-5 py-6 text-sm text-on-surface-variant">Đang tải danh sách lớp...</p>}
        </div>
      </Card>
    </div>
  );
}

export default ClassManagementPage;
