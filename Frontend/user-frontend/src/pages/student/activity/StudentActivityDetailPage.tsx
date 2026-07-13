import { ArrowLeft, CalendarDays, ExternalLink, MapPin, TicketCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Card from "../../../components/Card";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import { activityApi, type ActivityResponse } from "../../../services/api";
import { activityCategoryLabels, activityParticipationLabels, formatActivityRange } from "../../../utils/activityUi";

function StudentActivityDetailPage() {
  const { id = "" } = useParams();
  const [activity, setActivity] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadActivity = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setMessage("");
    try {
      const data = await activityApi.get(id);
      setActivity(data);
    } catch (err) {
      setActivity(null);
      setMessage(err instanceof Error ? err.message : "Không tải được chi tiết hoạt động.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadActivity();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadActivity]);

  if (loading) {
    return <div className="panel p-6 text-on-surface-variant">Đang tải chi tiết hoạt động...</div>;
  }

  if (!activity) {
    return (
      <div className="space-y-gutter">
        <PageHeader title="Không tìm thấy hoạt động" subtitle="Hoạt động này không còn tồn tại hoặc chưa được mở cho tài khoản của bạn." />
        {message && <div className="rounded-lg bg-error-container px-4 py-3 text-sm font-semibold text-error">{message}</div>}
        <Link className="font-semibold text-primary hover:underline" to="/student/activities">
          Quay lại danh sách hoạt động
        </Link>
      </div>
    );
  }
  const isLimitedActivity = (activity.participationType || "LIMITED") === "LIMITED";

  return (
    <div className="space-y-gutter">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline" to="/student/activities">
        <ArrowLeft className="h-4 w-4" />
        Quay lại hoạt động
      </Link>

      <PageHeader title={activity.title} subtitle="Xem thời gian, địa điểm, nội dung và thông tin đăng ký hoạt động." />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">{activityCategoryLabels[activity.category]}</p>
            <h2 className="mt-2 text-2xl font-bold text-on-surface">{activity.title}</h2>
          </div>
          <StatusBadge status={activity.status} />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-surface-container-low p-4">
            <p className="flex items-center gap-2 font-semibold text-on-surface">
              <CalendarDays className="h-5 w-5 text-primary" />
              Thời gian
            </p>
            <p className="mt-2 text-sm text-on-surface-variant">{formatActivityRange(activity.startTime, activity.endTime)}</p>
          </div>
          <div className="rounded-lg bg-surface-container-low p-4">
            <p className="flex items-center gap-2 font-semibold text-on-surface">
              <MapPin className="h-5 w-5 text-primary" />
              Địa điểm
            </p>
            <p className="mt-2 text-sm text-on-surface-variant">{activity.location || "Chưa cập nhật"}</p>
          </div>
          <div className="rounded-lg bg-surface-container-low p-4">
            <p className="flex items-center gap-2 font-semibold text-on-surface">
              <TicketCheck className="h-5 w-5 text-primary" />
              {isLimitedActivity ? "Đăng ký" : "Tham gia"}
            </p>
            <p className="mt-2 text-sm text-on-surface-variant">
              {isLimitedActivity
                ? `${activity.registrationCount ?? 0} sinh viên đã đăng ký${activity.capacity ? ` / tối đa ${activity.capacity}` : ""}`
                : "Hoạt động tự do, sinh viên có thể tham gia và điểm danh trực tiếp tại chương trình."}
            </p>
            <p className="mt-2 text-xs font-semibold text-primary">{activityParticipationLabels[activity.participationType || "LIMITED"]}</p>
          </div>
          <div className="rounded-lg bg-surface-container-low p-4">
            <p className="font-semibold text-on-surface">Điểm rèn luyện</p>
            <p className="mt-2 text-sm text-on-surface-variant">{activity.reward || "Chưa cập nhật"}</p>
          </div>
        </div>

        {isLimitedActivity && activity.googleFormUrl && activity.status !== "COMPLETED" && (
          <a className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-on-primary" href={activity.googleFormUrl} rel="noreferrer" target="_blank">
            <ExternalLink className="h-5 w-5" />
            Mở form đăng ký
          </a>
        )}
      </Card>
    </div>
  );
}

export default StudentActivityDetailPage;
