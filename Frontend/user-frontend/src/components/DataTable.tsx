import { Edit3, Eye, MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import StatusBadge from "./StatusBadge";
import type { StatusType, TableRow } from "../data/mockData";

export type Column<T> = {
  header: string;
  key: keyof T;
  render?: (row: T) => ReactNode;
};

type DataTableProps<T extends TableRow> = {
  columns: Column<T>[];
  rows: T[];
  caption?: string;
  actions?: (row: T) => ReactNode;
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

function DataTable<T extends TableRow>({ columns, rows, caption, actions }: DataTableProps<T>) {
  const fromRecord = rows.length > 0 ? 1 : 0;

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
              <th className="w-12 px-5 py-4">
                <input className="h-4 w-4 rounded border-outline-variant text-primary focus-ring" type="checkbox" />
              </th>
              {columns.map((column) => (
                <th key={String(column.key)} className="px-5 py-4 font-semibold text-on-surface">
                  {column.header}
                </th>
              ))}
              <th className="px-5 py-4 text-right font-semibold text-on-surface">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-outline-variant bg-surface-container-lowest">
                <td className="px-5 py-4">
                  <input className="h-4 w-4 rounded border-outline-variant text-primary focus-ring" type="checkbox" />
                </td>
                {columns.map((column) => {
                  const value = row[column.key];
                  return (
                    <td key={String(column.key)} className="px-5 py-4 text-on-surface-variant">
                      {column.render
                        ? column.render(row)
                        : isStatus(value)
                          ? <StatusBadge status={value} />
                          : value}
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
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="border-t border-outline-variant px-5 py-8 text-center text-sm font-semibold text-on-surface-variant">
            Không có dữ liệu phù hợp.
          </div>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-outline-variant px-5 py-4 text-sm text-on-surface-variant">
        <span>Hiển thị {fromRecord}-{rows.length} của {rows.length} bản ghi</span>
        {rows.length > 0 && (
          <span className="rounded-lg border border-outline-variant px-3 py-2 font-semibold text-primary">Trang 1</span>
        )}
      </div>
    </div>
  );
}

export default DataTable;
