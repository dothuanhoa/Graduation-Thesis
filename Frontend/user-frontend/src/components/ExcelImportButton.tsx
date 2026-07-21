import { FileSpreadsheet } from "lucide-react";
import { useRef, type ChangeEvent } from "react";

type ExcelImportButtonProps = {
  disabled?: boolean;
  loading?: boolean;
  label?: string;
  loadingLabel?: string;
  onImport: (file: File) => Promise<void> | void;
};

function ExcelImportButton({
  disabled = false,
  loading = false,
  label = "Import Excel",
  loadingLabel = "Đang import...",
  onImport,
}: ExcelImportButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    try {
      await onImport(selectedFile);
    } finally {
      event.target.value = "";
    }
  };

  return (
    <>
      <button
        className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary disabled:opacity-60"
        disabled={disabled || loading}
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        <FileSpreadsheet className="h-5 w-5" />
        {loading ? loadingLabel : label}
      </button>
      <input
        ref={inputRef}
        accept=".xlsx,.xls"
        className="sr-only"
        onChange={(event) => void handleFileChange(event)}
        type="file"
      />
    </>
  );
}

export default ExcelImportButton;
