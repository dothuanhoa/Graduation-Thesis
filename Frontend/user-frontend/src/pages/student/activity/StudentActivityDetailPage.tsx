import { CalendarDays, MapPin, TicketCheck, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BackButton from "../../../components/BackButton";
import Card from "../../../components/Card";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import { activityApi, ApiError, type ActivityResponse } from "../../../services/api";
import { activityCategoryLabels, activityParticipationLabels, formatActivityRange, formatDateTime } from "../../../utils/activityUi";

const resolveRegistrationButtonText = (activity: ActivityResponse, registering: boolean) => {
  if (registering) return "Đang đăng ký...";
  if (activity.currentUserRegistered) return "Bạn đã đăng ký hoạt động này";
  if (activity.registrationFull) return "Hoạt động đã đủ số lượng";
  if (!activity.registrationOpen) return "Chưa/không còn mở đăng ký";
  return "Đăng ký hoạt động";
};

function StudentActivityDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState("");

  const loadActivity = useCallback(async () => {
    if (!id) {
      navigate("/404", { replace: true });
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const data = await activityApi.get(id);
      setActivity(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        navigate("/404", { replace: true });
        return;
      }
      setActivity(null);
      setMessage(err instanceof Error ? err.message : "Không tải được chi tiết hoạt động.");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadActivity();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadActivity]);

  const registerActivity = async () => {
    if (!id || !activity) return;
    setRegistering(true);
    setMessage("");
    try {
      await activityApi.registerMe(id);
      const updated = await activityApi.get(id);
      setActivity(updated);
      setMessage("Đăng ký hoạt động thành công.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không đăng ký được hoạt động.");
      const updated = await activityApi.get(id).catch(() => null);
      if (updated) {
        setActivity(updated);
      }
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return <div className="panel p-6 text-on-surface-variant">Đang tải chi tiết hoạt động...</div>;
  }

  if (!activity) {
    return (
      <div className="space-y-gutter">
        <PageHeader title="Không tìm thấy hoạt động" subtitle="Hoạt động này không còn tồn tại hoặc chưa được mở cho tài khoản của bạn." />
        {message && <div className="rounded-lg bg-error-container px-4 py-3 text-sm font-semibold text-error">{message}</div>}
        <BackButton to="/student/activities">Quay lại danh sách hoạt động</BackButton>
      </div>
    );
  }

  const isLimitedActivity = (activity.participationType || "LIMITED") === "LIMITED";
  const canRegister = isLimitedActivity && Boolean(activity.registrationOpen) && !activity.currentUserRegistered && !activity.registrationFull;

  return (
    <div className="space-y-gutter">
      <BackButton to="/student/activities">Quay lại hoạt động</BackButton>

      <PageHeader title={activity.title} subtitle="Xem thời gian, địa điểm, nội dung và đăng ký hoạt động trực tiếp trên hệ thống." />

      {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">{message}</div>}

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
              Thời gian hoạt động
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
            {isLimitedActivity && (
              <div className="mt-2 space-y-1 text-xs text-on-surface-variant">
                <p>Mở đăng ký: {formatDateTime(activity.registrationStartTime)}</p>
                <p>Đóng đăng ký: {formatDateTime(activity.registrationEndTime)}</p>
                <p>Còn trống: {activity.remainingSlots ?? Math.max((activity.capacity ?? 0) - (activity.registrationCount ?? 0), 0)} slot</p>
              </div>
            )}
            <p className="mt-2 text-xs font-semibold text-primary">{activityParticipationLabels[activity.participationType || "LIMITED"]}</p>
          </div>
          <div className="rounded-lg bg-surface-container-low p-4">
            <p className="font-semibold text-on-surface">Điểm rèn luyện</p>
            <p className="mt-2 text-sm text-on-surface-variant">{activity.reward || "Chưa cập nhật"}</p>
          </div>
        </div>

        {isLimitedActivity && (
          <div className="mt-6 rounded-lg border border-outline-variant bg-surface-container-low p-4">
            <p className="font-semibold text-on-surface">Đăng ký minh bạch trên hệ thống</p>
            <p className="mt-2 text-sm text-on-surface-variant">
              Danh sách đăng ký được ghi nhận tự động theo tài khoản sinh viên đang đăng nhập. Phòng CTSV không thêm hoặc gỡ sinh viên khỏi danh sách đăng ký.
            </p>
            <button
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canRegister || registering}
              onClick={() => void registerActivity()}
              type="button"
            >
              <UserPlus className="h-5 w-5" />
              {resolveRegistrationButtonText(activity, registering)}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}

export default StudentActivityDetailPage;
