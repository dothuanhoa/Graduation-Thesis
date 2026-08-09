import { RotateCcw, Search } from "lucide-react";
import type { ReactNode } from "react";
import Card from "./Card";

export type FilterOption = {
  label: string;
  value: string;
};

export type FilterSelectConfig = {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
};

type FilterBarProps = {
  children?: ReactNode;
  filters?: FilterSelectConfig[];
  onReset?: () => void;
  onSearchChange?: (value: string) => void;
  resultText?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  title?: string;
};

function FilterBar({
  children,
  filters = [],
  onReset,
  onSearchChange = () => undefined,
  resultText,
  searchPlaceholder = "Tìm kiếm nhanh...",
  searchValue = "",
  title = "Tìm kiếm và lọc",
}: FilterBarProps) {
  return (
    <Card>
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-lg font-bold text-on-surface">{title}</h2>
        {resultText && <p className="text-sm text-on-surface-variant">{resultText}</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(240px,1.5fr)_repeat(3,minmax(160px,1fr))_auto] lg:items-end">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-on-surface">Từ khóa</span>
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant" />
            <input
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-3 pl-10 pr-3 text-sm text-on-surface placeholder:text-outline focus-ring"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              value={searchValue}
            />
          </span>
        </label>

        {filters.map((filter) => (
          <label key={filter.id} className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">{filter.label}</span>
            <select
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-3 text-sm text-on-surface focus-ring"
              onChange={(event) => filter.onChange(event.target.value)}
              value={filter.value}
            >
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}

        {children}

        {onReset && (
          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-5 py-3 font-semibold text-primary hover:bg-surface-container"
            onClick={onReset}
            type="button"
          >
            <RotateCcw className="h-5 w-5" />
            Xóa lọc
          </button>
        )}
      </div>
    </Card>
  );
}

export default FilterBar;
