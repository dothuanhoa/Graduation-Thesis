import { CalendarDays, ExternalLink, MapPin, RefreshCw, TicketCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../../../components/Card";
import FilterBar from "../../../components/FilterBar";
import PageHeader from "../../../components/PageHeader";
import PaginationControls from "../../../components/PaginationControls";
import StatusBadge from "../../../components/StatusBadge";
import { usePaginatedList } from "../../../hooks/usePaginatedList";
import { activityApi, type ActivityResponse } from "../../../services/api";
import { activityCategoryLabels, activityParticipationLabels, formatActivityRange } from "../../../utils/activityUi";
import { includesSearch } from "../../../utils/search";

function StudentActivitiesPage() {
  const [activities, setActivities] = useState<ActivityResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [keyword, setKeyword] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [participationFilter, setParticipationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

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

  const filteredActivities = useMemo(
    () =>
      activities.filter((activity) => {
        const matchesKeyword = includesSearch(`${activity.title} ${activity.location} ${activity.reward}`, keyword);
        const matchesCategory = !categoryFilter || activity.category === categoryFilter;
        const matchesParticipation = !participationFilter || (activity.participationType || "LIMITED") === participationFilter;
        const matchesStatus = !statusFilter || activity.status === statusFilter;
        return matchesKeyword && matchesCategory && matchesParticipation && matchesStatus;
      }),
    [activities, categoryFilter, keyword, participationFilter, statusFilter],
  );

  const sortedActivities = useMemo(
    () =>
      [...filteredActivities].sort((a, b) => {
        const statusOrder = { ONGOING: 0, UPCOMING: 1, COMPLETED: 2 };
        const statusDiff = statusOrder[a.status] - statusOrder[b.status];
        if (statusDiff !== 0) return statusDiff;
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      }),
    [filteredActivities],
  );

  const {
    pageItems: paginatedActivities,
    pageIndex,
    pageSize,
    totalItems,
    setPageIndex,
    setPageSize,
  } = usePaginatedList(sortedActivities);

  return (
    <div className="space-y-gutter">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <PageHeader
          title="Hoạt động ngoại khóa"
          subtitle="Theo dõi hoạt động ngoại khóa, thời gian, địa điểm và thông tin đăng ký."
        />
        <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" onClick={loadActivities} type="button">
          <RefreshCw className="h-5 w-5" />
          Tải lại
        </button>
      </div>

      {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">{message}</div>}

      <FilterBar
        filters={[
          {
            id: "category",
            label: "Loại hoạt động",
            value: categoryFilter,
            onChange: setCategoryFilter,
            options: [
              { value: "", label: "Tất cả loại" },
              ...Object.entries(activityCategoryLabels).map(([value, label]) => ({ value, label })),
            ],
          },
          {
            id: "participation",
            label: "Hình thức",
            value: participationFilter,
            onChange: setParticipationFilter,
            options: [
              { value: "", label: "Tất cả hình thức" },
              ...Object.entries(activityParticipationLabels).map(([value, label]) => ({ value, label })),
            ],
          },
          {
            id: "status",
            label: "Trạng thái",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "", label: "Tất cả trạng thái" },
              { value: "UPCOMING", label: "Sắp diễn ra" },
              { value: "ONGOING", label: "Đang diễn ra" },
              { value: "COMPLETED", label: "Đã kết thúc" },
            ],
          },
        ]}
        onReset={() => {
          setKeyword("");
          setCategoryFilter("");
          setParticipationFilter("");
          setStatusFilter("");
        }}
        onSearchChange={setKeyword}
        resultText={`Hiển thị ${filteredActivities.length} / ${activities.length} hoạt động`}
        searchPlaceholder="Nhập tên, địa điểm hoặc điểm rèn luyện"
        searchValue={keyword}
        title="Lọc hoạt động"
      />

      {loading ? (
        <div className="panel p-6 text-on-surface-variant">Đang tải danh sách hoạt động...</div>
      ) : sortedActivities.length === 0 ? (
        <div className="panel p-6 text-on-surface-variant">
          {activities.length === 0 ? "Hiện chưa có hoạt động nào." : "Không tìm thấy hoạt động phù hợp với bộ lọc hiện tại."}
        </div>
      ) : (
        <>
        <div className="grid gap-gutter lg:grid-cols-3">
          {paginatedActivities.map((activity) => (
            <Card key={activity.id} className="flex flex-col overflow-hidden p-0">
              <div className="bg-surface-container-low p-5">
                <div className="mb-8 flex items-start justify-between gap-4">
                  <span className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-on-primary">{activity.reward || activityCategoryLabels[activity.category]}</span>
                  <StatusBadge status={activity.status} />
                </div>
                <h2 className="text-xl font-bold text-on-surface">{activity.title}</h2>
              </div>
              <div className="flex flex-1 flex-col space-y-3 p-5 text-sm text-on-surface-variant">
                <p className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  {formatActivityRange(activity.startTime, activity.endTime)}
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  {activity.location || "Chưa cập nhật địa điểm"}
                </p>
                <p className="flex items-center gap-2">
                  <TicketCheck className="h-4 w-4 text-primary" />
                  {(activity.participationType || "LIMITED") === "OPEN"
                    ? "Tự do tham gia"
                    : `${activity.registrationCount ?? 0} sinh viên đăng ký${activity.capacity ? ` / tối đa ${activity.capacity}` : ""}`}
                </p>
                <p className="text-xs font-semibold text-primary">{activityParticipationLabels[activity.participationType || "LIMITED"]}</p>
                <div className="mt-auto flex flex-wrap gap-3 pt-4">
                  <Link className="rounded-lg border border-primary px-4 py-3 font-semibold text-primary hover:bg-surface-container-low" to={`/student/activities/${activity.id}`}>
                    Xem chi tiết
                  </Link>
                  {(activity.participationType || "LIMITED") === "LIMITED" && activity.googleFormUrl && activity.status !== "COMPLETED" && (
                    <a className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary" href={activity.googleFormUrl} rel="noreferrer" target="_blank">
                      <ExternalLink className="h-4 w-4" />
                      Đăng ký
                    </a>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
        <PaginationControls
          itemLabel="hoạt động"
          onPageChange={setPageIndex}
          onPageSizeChange={setPageSize}
          pageIndex={pageIndex}
          pageSize={pageSize}
          totalItems={totalItems}
        />
        </>
      )}
    </div>
  );
}

export default StudentActivitiesPage;
