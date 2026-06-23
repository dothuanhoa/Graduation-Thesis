import { Filter, Search } from "lucide-react";
import Card from "./Card";

type FilterBarProps = {
  searchPlaceholder?: string;
  filters?: string[];
};

function FilterBar({ searchPlaceholder = "Tìm kiếm nhanh...", filters = ["Khoa", "Lớp", "Trạng thái"] }: FilterBarProps) {
  return (
    <Card>
      <div className="grid gap-4 md:grid-cols-[1.5fr_repeat(3,1fr)_auto] md:items-end">
        <label className="flex flex-col gap-2">
          <span className="font-semibold text-on-surface">Tìm kiếm</span>
          <span className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant" />
            <input className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-3 pl-10 pr-3 focus-ring" placeholder={searchPlaceholder} />
          </span>
        </label>
        {filters.map((filter) => (
          <label key={filter} className="flex flex-col gap-2">
            <span className="font-semibold text-on-surface">{filter}</span>
            <select className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-3 focus-ring">
              <option>Tất cả</option>
              <option>Đang hoạt động</option>
              <option>Chờ xử lý</option>
            </select>
          </label>
        ))}
        <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-5 py-3 font-semibold text-primary hover:bg-surface-container" type="button">
          <Filter className="h-5 w-5" />
          Lọc
        </button>
      </div>
    </Card>
  );
}

export default FilterBar;
