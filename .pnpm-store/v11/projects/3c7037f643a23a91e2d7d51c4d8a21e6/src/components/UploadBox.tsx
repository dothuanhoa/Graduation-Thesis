import { FileSpreadsheet, Upload } from "lucide-react";

function UploadBox() {
  return (
    <div className="rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-low p-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary-fixed text-primary">
        <FileSpreadsheet className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-semibold text-on-surface">Kéo thả file Excel vào đây</h3>
      <p className="mt-2 text-sm text-on-surface-variant">Hỗ trợ .xlsx theo template của trường. Hệ thống sẽ validate từng dòng trước khi import.</p>
      <button className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary" type="button">
        <Upload className="h-5 w-5" />
        Chọn file
      </button>
    </div>
  );
}

export default UploadBox;
