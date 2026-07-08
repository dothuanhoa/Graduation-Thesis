import { FileSpreadsheet, Upload } from "lucide-react";
import { useState, type FormEvent } from "react";
import Card from "../../../components/Card";
import PageHeader from "../../../components/PageHeader";
import { userApi } from "../../../services/api";
import { excelImportSchema, getYupMessage } from "../../../validation/userSchemas";

function StudentImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    setLoading(true);
    try {
      await excelImportSchema.validate({ file });
      const result = await userApi.importExcel(file as File);
      setMessage(result || "Import danh sách sinh viên thành công.");
    } catch (err) {
      setMessage(getYupMessage(err, err instanceof Error ? err.message : "Import thất bại."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Import sinh viên từ Excel"
        subtitle="Nạp danh sách sinh viên từ file mẫu và tự động tạo hồ sơ đăng nhập."
      />
      <Card>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-lowest px-6 py-10 text-center transition hover:border-primary hover:bg-primary-fixed">
            <FileSpreadsheet className="h-12 w-12 text-primary" />
            <span className="mt-4 text-lg font-bold text-on-surface">{file ? file.name : "Chọn file Excel"}</span>
            <span className="mt-2 text-sm text-on-surface-variant">Hỗ trợ .xlsx hoặc .xls, dung lượng tối đa 10MB.</span>
            <input
              accept=".xlsx,.xls"
              className="sr-only"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setMessage("");
              }}
              type="file"
            />
          </label>

          {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 font-semibold text-primary">{message}</div>}

          <button
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            <Upload className="h-5 w-5" />
            {loading ? "Đang import..." : "Import danh sách"}
          </button>
        </form>
      </Card>
    </>
  );
}

export default StudentImportPage;
