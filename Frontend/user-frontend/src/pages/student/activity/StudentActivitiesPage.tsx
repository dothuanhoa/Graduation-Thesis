import { CalendarDays, ExternalLink, MapPin, RefreshCw, TicketCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../../../components/Card";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import { activityApi, type ActivityResponse } from "../../../services/api";
import { activityCategoryLabels, formatActivityRange } from "../../../utils/activityUi";

function StudentActivitiesPage() {
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

  const sortedActivities = useMemo(
    () =>
      [...activities].sort((a, b) => {
        const statusOrder = { ONGOING: 0, UPCOMING: 1, COMPLETED: 2 };
        const statusDiff = statusOrder[a.status] - statusOrder[b.status];
        if (statusDiff !== 0) return statusDiff;
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      }),
    [activities],
  );

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

      {loading ? (
        <div className="panel p-6 text-on-surface-variant">Đang tải danh sách hoạt động...</div>
      ) : sortedActivities.length === 0 ? (
        <div className="panel p-6 text-on-surface-variant">Hiện chưa có hoạt động nào đang mở.</div>
      ) : (
        <div className="grid gap-gutter lg:grid-cols-3">
          {sortedActivities.map((activity) => (
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
                  {activity.registrationCount ?? 0} sinh viên đăng ký
                  {activity.capacity ? ` / tối đa ${activity.capacity}` : ""}
                </p>
                <div className="mt-auto flex flex-wrap gap-3 pt-4">
                  <Link className="rounded-lg border border-primary px-4 py-3 font-semibold text-primary hover:bg-surface-container-low" to={`/student/activities/${activity.id}`}>
                    Xem chi tiết
                  </Link>
                  {activity.googleFormUrl && activity.status !== "COMPLETED" && (
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
      )}
    </div>
  );
}

export default StudentActivitiesPage;
