import { CalendarPlus, Eye, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DataTable, { type Column } from "../../../components/DataTable";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import type { StatusType, TableRow } from "../../../data/mockData";
import { activityApi, type ActivityResponse } from "../../../services/api";
import { activityCategoryLabels, activityParticipationLabels, formatActivityRange } from "../../../utils/activityUi";

type ActivityRow = TableRow & {
  id: string;
  title: string;
  category: string;
  participationType: string;
  time: string;
  capacity: string;
  status: StatusType;
};

const toRow = (activity: ActivityResponse): ActivityRow => ({
  id: activity.id,
  title: activity.title,
  category: activityCategoryLabels[activity.category],
  participationType: activityParticipationLabels[activity.participationType || "LIMITED"],
  time: formatActivityRange(activity.startTime, activity.endTime),
  capacity:
    (activity.participationType || "LIMITED") === "OPEN"
      ? `${activity.attendedCount ?? 0} đã điểm danh`
      : `${activity.attendedCount ?? 0}/${activity.registrationCount ?? 0}${activity.capacity ? ` / ${activity.capacity}` : ""}`,
  status: activity.status,
});

const columns: Column<ActivityRow>[] = [
  { header: "Tên hoạt động", key: "title" },
  { header: "Loại", key: "category" },
  { header: "Hình thức", key: "participationType" },
  { header: "Thời gian", key: "time" },
  { header: "Điểm danh", key: "capacity" },
  { header: "Trạng thái", key: "status", render: (row) => <StatusBadge status={row.status} /> },
];

function AdminActivitiesPage() {
  const [activities, setActivities] = useState<ActivityResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadActivities = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const data = await activityApi.list();
      setActivities(data);
    } catch (err) {
      setActivities([]);
      setMessage(err instanceof Error ? err.message : "Không tải được danh sách hoạt động.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadActivities();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadActivities]);

  const rows = useMemo(
    () =>
      [...activities]
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
        .map(toRow),
    [activities],
  );

  const removeActivity = async (row: ActivityRow) => {
    if (!window.confirm(`Xóa hoạt động "${row.title}"? Chỉ hoạt động sắp diễn ra mới được xóa.`)) return;

    setMessage("");
    try {
      await activityApi.remove(row.id);
      setActivities((current) => current.filter((activity) => activity.id !== row.id));
      setMessage("Đã xóa hoạt động.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không xóa được hoạt động.");
    }
  };

  return (
    <div className="space-y-gutter">
      <PageHeader
        title="Quản lý hoạt động"
        subtitle="Quản lý lịch hoạt động, số lượng đăng ký và tình hình điểm danh."
      />

      <div className="flex flex-wrap gap-3">
        <Link className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary" to="/admin/activities/new">
          <CalendarPlus className="h-5 w-5" />
          Tạo hoạt động
        </Link>
        <button className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" onClick={loadActivities} type="button">
          <RefreshCw className="h-5 w-5" />
          Tải lại
        </button>
      </div>

      {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">{message}</div>}

      {loading ? (
        <div className="panel p-6 text-on-surface-variant">Đang tải danh sách hoạt động...</div>
      ) : (
        <DataTable
          actions={(row) => (
            <div className="flex justify-end gap-2">
              <Link
                className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm font-semibold text-primary hover:bg-surface-container"
                to={`/admin/activities/${row.id}`}
              >
                <Eye className="h-4 w-4" />
                Xem
              </Link>
              <button
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-error hover:bg-error-container"
                onClick={() => void removeActivity(row)}
                type="button"
              >
                <Trash2 className="h-4 w-4" />
                Xóa
              </button>
            </div>
          )}
          caption="Danh sách hoạt động"
          columns={columns}
          rows={rows}
        />
      )}
    </div>
  );
}

export default AdminActivitiesPage;
