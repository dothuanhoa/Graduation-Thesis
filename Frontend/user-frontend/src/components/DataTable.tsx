import { Edit3, Eye, MoreHorizontal } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import type { StatusType, TableRow } from "../data/mockData";
import PaginationControls from "./PaginationControls";
import StatusBadge from "./StatusBadge";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export type Column<T> = {
  header: string;
  key: keyof T;
  render?: (row: T) => ReactNode;
};

type ServerPaginationConfig = {
  pageIndex: number;
  pageSize: number;
  totalItems: number;
  pageSizeOptions?: number[];
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

type DataTableProps<T extends TableRow> = {
  columns: Column<T>[];
  rows: T[];
  caption?: string;
  actions?: (row: T) => ReactNode;
  getRowId?: (row: T, rowIndex: number) => string;
  selectedRowIds?: string[];
  onSelectedRowIdsChange?: (selectedRowIds: string[]) => void;
  selectable?: boolean;
  defaultPageSize?: number;
  itemLabel?: string;
  pagination?: boolean;
  pageSizeOptions?: number[];
  serverPagination?: ServerPaginationConfig;
};

const isStatus = (value: string | number): value is StatusType => {
  const statuses: StatusType[] = [
    "ACTIVE",
    "INACTIVE",
    "DRAFT",
    "PUBLISHED",
    "PENDING",
    "PROCESSING",
    "APPROVED",
    "REJECTED",
    "COMPLETED",
    "UPCOMING",
    "ONGOING",
    "STUDYING",
    "RESERVED",
    "SUSPENDED",
    "GRADUATED",
    "URGENT",
    "NORMAL",
    "EXPIRED",
    "REVOKED",
    "CANCELLED",
    "NEEDS_INFO",
  ];
  return typeof value === "string" && statuses.includes(value as StatusType);
};

function DataTable<T extends TableRow>({
  columns,
  rows,
  caption,
  actions,
  getRowId,
  selectedRowIds,
  onSelectedRowIdsChange,
  selectable = true,
  defaultPageSize = 10,
  itemLabel = "bản ghi",
  pagination = true,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  serverPagination,
}: DataTableProps<T>) {
  const [clientPageIndex, setClientPageIndex] = useState(0);
  const [clientPageSize, setClientPageSize] = useState(defaultPageSize);
  const isServerPaginated = Boolean(serverPagination);
  const pageSize = serverPagination?.pageSize ?? clientPageSize;
  const totalItems = serverPagination?.totalItems ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const rawPageIndex = serverPagination?.pageIndex ?? clientPageIndex;
  const pageIndex = Math.min(Math.max(rawPageIndex, 0), totalPages - 1);
  const [internalSelectedRowIds, setInternalSelectedRowIds] = useState<string[]>([]);
  const currentSelectedRowIds = selectedRowIds ?? internalSelectedRowIds;
  const selectedSet = useMemo(() => new Set(currentSelectedRowIds), [currentSelectedRowIds]);

  const visibleRows = useMemo(() => {
    if (!pagination || isServerPaginated) return rows;
    const start = pageIndex * clientPageSize;
    return rows.slice(start, start + clientPageSize);
  }, [clientPageSize, isServerPaginated, pageIndex, pagination, rows]);

  const handlePageChange = (nextPageIndex: number) => {
    if (serverPagination) {
      serverPagination.onPageChange(nextPageIndex);
      return;
    }
    setClientPageIndex(nextPageIndex);
  };

  const handlePageSizeChange = (nextPageSize: number) => {
    if (serverPagination) {
      serverPagination.onPageSizeChange(nextPageSize);
      return;
    }
    setClientPageSize(nextPageSize);
    setClientPageIndex(0);
  };

  const resolveRowId = (row: T, rowIndex: number) => getRowId?.(row, rowIndex) ?? String(row.id ?? rowIndex);

  const updateSelectedRowIds = (nextSelectedRowIds: string[]) => {
    if (onSelectedRowIdsChange) {
      onSelectedRowIdsChange(nextSelectedRowIds);
      return;
    }
    setInternalSelectedRowIds(nextSelectedRowIds);
  };

  const visibleRowIds = visibleRows.map((row, rowIndex) => resolveRowId(row, rowIndex));
  const allVisibleSelected = visibleRowIds.length > 0 && visibleRowIds.every((rowId) => selectedSet.has(rowId));
  const toggleVisibleRows = (checked: boolean) => {
    if (checked) {
      updateSelectedRowIds(Array.from(new Set([...currentSelectedRowIds, ...visibleRowIds])));
      return;
    }
    updateSelectedRowIds(currentSelectedRowIds.filter((rowId) => !visibleRowIds.includes(rowId)));
  };

  const toggleRow = (rowId: string, checked: boolean) => {
    if (checked) {
      updateSelectedRowIds(Array.from(new Set([...currentSelectedRowIds, rowId])));
      return;
    }
    updateSelectedRowIds(currentSelectedRowIds.filter((selectedRowId) => selectedRowId !== rowId));
  };

  return (
    <div className="panel overflow-hidden">
      {caption && (
        <div className="border-b border-outline-variant px-5 py-4">
          <h2 className="text-lg font-semibold text-on-surface">{caption}</h2>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="bg-surface-container-low">
            <tr>
              {selectable && (
                <th className="w-12 px-5 py-4">
                  <input
                    checked={allVisibleSelected}
                    className="h-4 w-4 rounded border-outline-variant text-primary focus-ring"
                    onChange={(event) => toggleVisibleRows(event.target.checked)}
                    type="checkbox"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th key={String(column.key)} className="px-5 py-4 font-semibold text-on-surface">
                  {column.header}
                </th>
              ))}
              <th className="px-5 py-4 text-right font-semibold text-on-surface">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rowIndex) => {
              const rowId = resolveRowId(row, rowIndex);
              return (
              <tr key={rowId} className="border-t border-outline-variant bg-surface-container-lowest">
                {selectable && (
                  <td className="px-5 py-4">
                    <input
                      checked={selectedSet.has(rowId)}
                      className="h-4 w-4 rounded border-outline-variant text-primary focus-ring"
                      onChange={(event) => toggleRow(rowId, event.target.checked)}
                      type="checkbox"
                    />
                  </td>
                )}
                {columns.map((column) => {
                  const value = row[column.key];
                  return (
                    <td key={String(column.key)} className="px-5 py-4 text-on-surface-variant">
                      {column.render ? column.render(row) : isStatus(value) ? <StatusBadge status={value} /> : value}
                    </td>
                  );
                })}
                <td className="px-5 py-4">
                  {actions ? (
                    actions(row)
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container" type="button">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container" type="button">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container" type="button">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="border-t border-outline-variant px-5 py-8 text-center text-sm font-semibold text-on-surface-variant">
            Không có dữ liệu phù hợp.
          </div>
        )}
      </div>
      {pagination ? (
        <PaginationControls
          itemLabel={itemLabel}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          pageIndex={pageIndex}
          pageSize={pageSize}
          pageSizeOptions={serverPagination?.pageSizeOptions ?? pageSizeOptions}
          totalItems={totalItems}
        />
      ) : (
        <div className="border-t border-outline-variant px-5 py-4 text-sm text-on-surface-variant">
          Hiển thị {rows.length} {itemLabel}
        </div>
      )}
    </div>
  );
}

export default DataTable;
