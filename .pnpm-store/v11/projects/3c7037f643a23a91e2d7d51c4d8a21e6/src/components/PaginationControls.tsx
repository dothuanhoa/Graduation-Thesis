import { ChevronLeft, ChevronRight } from "lucide-react";

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

type PaginationControlsProps = {
  pageIndex: number;
  pageSize: number;
  totalItems: number;
  itemLabel?: string;
  pageSizeOptions?: number[];
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

const getPageNumbers = (pageIndex: number, totalPages: number) => {
  const pages = new Set<number>([0, totalPages - 1, pageIndex - 1, pageIndex, pageIndex + 1]);
  return Array.from(pages)
    .filter((page) => page >= 0 && page < totalPages)
    .sort((a, b) => a - b);
};

function PaginationControls({
  pageIndex,
  pageSize,
  totalItems,
  itemLabel = "bản ghi",
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePageIndex = Math.min(Math.max(pageIndex, 0), totalPages - 1);
  const fromRecord = totalItems === 0 ? 0 : safePageIndex * pageSize + 1;
  const toRecord = Math.min(totalItems, (safePageIndex + 1) * pageSize);
  const pageNumbers = getPageNumbers(safePageIndex, totalPages);

  return (
    <div className="flex flex-col gap-3 border-t border-outline-variant px-5 py-4 text-sm text-on-surface-variant lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <span>
          Hiển thị {fromRecord}-{toRecord} của {totalItems} {itemLabel}
        </span>
        <label className="flex items-center gap-2">
          <span>Số dòng</span>
          <select
            className="h-9 rounded-lg border border-outline-variant bg-surface-container-lowest px-2 text-sm font-semibold text-on-surface focus-ring"
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            value={pageSize}
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-outline-variant px-3 font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50"
          disabled={safePageIndex === 0}
          onClick={() => onPageChange(safePageIndex - 1)}
          type="button"
        >
          <ChevronLeft className="h-4 w-4" />
          Trước
        </button>
        {pageNumbers.map((page, index) => {
          const previousPage = pageNumbers[index - 1];
          const hasGap = previousPage !== undefined && page - previousPage > 1;

          return (
            <span key={page} className="flex items-center gap-2">
              {hasGap && <span className="px-1 text-outline">...</span>}
              <button
                className={`h-9 min-w-9 rounded-lg border px-3 font-semibold ${
                  page === safePageIndex
                    ? "border-primary bg-primary text-on-primary"
                    : "border-outline-variant text-primary hover:bg-surface-container"
                }`}
                onClick={() => onPageChange(page)}
                type="button"
              >
                {page + 1}
              </button>
            </span>
          );
        })}
        <button
          className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-outline-variant px-3 font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50"
          disabled={safePageIndex >= totalPages - 1}
          onClick={() => onPageChange(safePageIndex + 1)}
          type="button"
        >
          Sau
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default PaginationControls;
