import { useMemo, useState } from "react";

export function usePaginatedList<T>(items: T[], initialPageSize = 10) {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePageIndex = Math.min(Math.max(pageIndex, 0), totalPages - 1);

  const pageItems = useMemo(() => {
    const start = safePageIndex * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, pageSize, safePageIndex]);

  const setPageSize = (nextPageSize: number) => {
    setPageSizeState(nextPageSize);
    setPageIndex(0);
  };

  return {
    pageIndex: safePageIndex,
    pageSize,
    pageItems,
    totalItems: items.length,
    setPageIndex,
    setPageSize,
  };
}
