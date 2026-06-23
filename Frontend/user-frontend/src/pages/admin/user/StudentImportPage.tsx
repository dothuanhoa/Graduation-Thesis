import { Upload } from "lucide-react";
import { useState, type FormEvent } from "react";
import Card from "../../../components/Card";
import PageHeader from "../../../components/PageHeader";
import UploadBox from "../../../components/UploadBox";
import { userApi } from "../../../services/api";
import { excelImportSchema } from "../../../validation/userSchemas";

function StudentImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (!file) {
      setMessage("Vui lòng chọn file Excel trước khi import.");
      return;
    }

    setLoading(true);
    try {
      await excelImportSchema.validate({ file });
      const result = await userApi.importExcel(file);
      setMessage(result || "Import thành công.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Import thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Import sinh viên từ Excel"
        subtitle="Form này gọi POST /api/users/import bằng multipart/form-data."
      />
      <Card>
        <UploadBox />
        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <input
            accept=".xlsx,.xls"
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            type="file"
          />
          {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 font-semibold text-primary">{message}</div>}
          <button
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            <Upload className="h-5 w-5" />
            {loading ? "Đang import..." : "Import vào user-service"}
          </button>
        </form>
      </Card>
    </>
  );
}

export default StudentImportPage;
