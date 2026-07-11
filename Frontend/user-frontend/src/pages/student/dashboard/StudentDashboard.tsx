import { ArrowRight, Bell, CalendarCheck, CalendarDays, FileCheck2, MapPin, QrCode, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { Link, useOutletContext } from "react-router-dom";
import Card from "../../../components/Card";
import StatusBadge from "../../../components/StatusBadge";
import { useAuth } from "../../../context/useAuth";
import type { StatusType } from "../../../data/mockData";
import type { StudentLayoutContext } from "../../../layouts/StudentLayout";
import { activityApi, notificationApi, type ActivityResponse, type NotificationResponse } from "../../../services/api";
import { formatActivityRange } from "../../../utils/activityUi";

type DashboardNotice = {
  id: string;
  title: string;
  source: string;
  time: string;
  priority: StatusType;
};

type QuickAction = {
  title: string;
  helper: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  requiresScanPermission?: boolean;
};

const formatDateTime = (value?: string) => {
  if (!value) return "Vừa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16).replace("T", " ");
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

const toDashboardNotice = (item: NotificationResponse): DashboardNotice => ({
  id: item.id,
  title: item.title,
  source: item.createdBy || "Phòng Công tác sinh viên",
  time: formatDateTime(item.startDate || item.createdAt),
  priority: item.priority as StatusType,
});

const getNoticeTime = (item: NotificationResponse) => {
  const time = new Date(item.startDate || item.createdAt || "").getTime();
  return Number.isNaN(time) ? 0 : time;
};

const sortDashboardNotices = (items: NotificationResponse[]) =>
  [...items].sort((left, right) => {
    const priorityDiff = (left.priority === "URGENT" ? 0 : 1) - (right.priority === "URGENT" ? 0 : 1);
    return priorityDiff || getNoticeTime(right) - getNoticeTime(left);
  });

const quickActions: QuickAction[] = [
  { title: "Hồ sơ cá nhân", helper: "Cập nhật thông tin liên hệ", path: "/student/profile", icon: UserRound },
  { title: "Thông báo", helper: "Theo dõi tin mới", path: "/student/notifications", icon: Bell },
  { title: "Hoạt động", helper: "Xem lịch và form đăng ký", path: "/student/activities", icon: CalendarCheck },
  { title: "Quét điểm danh", helper: "Mở camera quét mã", path: "/checker/scan", icon: QrCode, requiresScanPermission: true },
  { title: "Đơn xác nhận", helper: "Gửi yêu cầu giấy tờ", path: "/student/certificates/new", icon: FileCheck2 },
];

function StudentDashboard() {
  const { username } = useAuth();
  const { checkerActivities: scanActivities = [] } = useOutletContext<StudentLayoutContext>();
  const [notices, setNotices] = useState<DashboardNotice[]>([]);
  const [activities, setActivities] = useState<ActivityResponse[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const [notificationData, activityData] = await Promise.all([
        notificationApi.listMine({}, { suppressToast: true }).catch(() => []),
        activityApi.list({ suppressToast: true }).catch(() => []),
      ]);

      setNotices(sortDashboardNotices(notificationData).slice(0, 3).map(toDashboardNotice));
      setActivities(activityData);
    } catch (err) {
      setNotices([]);
      setActivities([]);
      setMessage(err instanceof Error ? err.message : "Không tải được dữ liệu tổng quan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadDashboard]);

  const ongoingActivities = activities.filter((activity) => activity.status === "ONGOING");
  const nextActivity = useMemo(
    () =>
      [...activities]
        .filter((activity) => activity.status !== "COMPLETED")
        .sort((left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime())[0] ?? null,
    [activities],
  );
  const urgentNotices = notices.filter((notice) => notice.priority === "URGENT");
  const canScanAttendance = scanActivities.length > 0;
  const visibleQuickActions = useMemo(
    () => quickActions.filter((action) => !action.requiresScanPermission || canScanAttendance),
    [canScanAttendance],
  );
  const statGridClass = canScanAttendance ? "grid gap-4 md:grid-cols-3" : "grid gap-4 md:grid-cols-2";

  return (
    <div className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <div className="rounded-lg bg-primary px-6 py-5 text-on-primary shadow-panel">
          <p className="text-sm font-semibold text-on-primary-container">Cổng sinh viên STU</p>
          <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-bold">Xin chào, {username || "sinh viên"}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-on-primary-container">
                Theo dõi thông báo, hoạt động, điểm danh và yêu cầu giấy xác nhận trong một màn hình gọn gàng.
              </p>
            </div>
            <div className="flex flex-shrink-0 flex-wrap gap-2">
              <Link className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-primary" to="/student/profile">
                Hồ sơ
                <ArrowRight className="h-4 w-4" />
              </Link>
              {canScanAttendance && (
                <Link className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-4 py-2.5 text-sm font-semibold text-white" to="/checker/scan">
                  <QrCode className="h-4 w-4" />
                  Quét mã
                </Link>
              )}
            </div>
          </div>
        </div>

        <Card className="flex h-full flex-col justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Việc cần chú ý</p>
            <h2 className="mt-2 line-clamp-2 text-xl font-bold text-on-surface">
              {urgentNotices[0]?.title || nextActivity?.title || "Chưa có việc cần xử lý"}
            </h2>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-on-surface-variant">
              {urgentNotices.length > 0
                ? "Ưu tiên đọc thông báo cấp bách trước khi tiếp tục các tác vụ khác."
                : nextActivity
                  ? "Kiểm tra thời gian và địa điểm để chủ động tham gia đúng hạn."
                  : "Thông tin quan trọng sẽ xuất hiện khi có thông báo hoặc hoạt động mới."}
            </p>
          </div>
          {nextActivity && (
            <div className="mt-4 space-y-2 text-sm text-on-surface-variant">
              <p className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                <span className="truncate">{formatActivityRange(nextActivity.startTime, nextActivity.endTime)}</span>
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="truncate">{nextActivity.location || "Chưa cập nhật địa điểm"}</span>
              </p>
            </div>
          )}
        </Card>
      </section>

      {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">{message}</div>}

      <section className={statGridClass}>
        <Link className="panel block rounded-lg p-4 transition hover:shadow-raised focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" to="/student/notifications">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-on-surface-variant">Thông báo mới</p>
              <p className="mt-2 text-3xl font-bold text-on-surface">{loading ? "..." : notices.length}</p>
              <p className="mt-1 text-sm text-on-surface-variant">{urgentNotices.length} cấp bách</p>
            </div>
            <div className="rounded-lg bg-primary-fixed p-3 text-primary">
              <Bell className="h-6 w-6" />
            </div>
          </div>
        </Link>

        <Link className="panel block rounded-lg p-4 transition hover:shadow-raised focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" to="/student/activities">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-on-surface-variant">Hoạt động đang mở</p>
              <p className="mt-2 text-3xl font-bold text-on-surface">{loading ? "..." : ongoingActivities.length}</p>
              <p className="mt-1 text-sm text-on-surface-variant">Xem danh sách hoạt động</p>
            </div>
            <div className="rounded-lg bg-emerald-100 p-3 text-emerald-700">
              <CalendarCheck className="h-6 w-6" />
            </div>
          </div>
        </Link>

        {canScanAttendance && (
          <Link className="panel block rounded-lg p-4 transition hover:shadow-raised focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" to="/checker/scan">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-on-surface-variant">Điểm danh</p>
                <p className="mt-2 text-3xl font-bold text-on-surface">{loading ? "..." : scanActivities.length}</p>
                <p className="mt-1 text-sm text-on-surface-variant">Hoạt động được phân quyền</p>
              </div>
              <div className="rounded-lg bg-orange-100 p-3 text-orange-800">
                <QrCode className="h-6 w-6" />
              </div>
            </div>
          </Link>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-primary">Thông báo</p>
              <h2 className="text-xl font-bold text-on-surface">Tin mới từ nhà trường</h2>
            </div>
            <Link className="text-sm font-semibold text-primary" to="/student/notifications">
              Xem tất cả
            </Link>
          </div>
          <div className="divide-y divide-outline-variant">
            {loading && <p className="py-3 text-sm font-semibold text-on-surface-variant">Đang tải thông báo...</p>}

            {!loading && notices.length === 0 && (
              <p className="py-3 text-sm font-semibold text-on-surface-variant">Chưa có thông báo phù hợp với tài khoản của bạn.</p>
            )}

            {!loading &&
              notices.slice(0, 2).map((notice) => (
                <article key={notice.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link className="line-clamp-1 font-bold text-on-surface hover:text-primary" to={`/student/notifications/${notice.id}`}>
                        {notice.title}
                      </Link>
                      <p className="mt-1 truncate text-sm text-on-surface-variant">
                        {notice.source} · {notice.time}
                      </p>
                    </div>
                    <StatusBadge status={notice.priority} />
                  </div>
                </article>
              ))}
          </div>
        </Card>

        <Card>
          <p className="text-sm font-semibold text-primary">Lối tắt</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            {visibleQuickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.path} className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-surface-container-low" to={action.path}>
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-on-surface">{action.title}</span>
                    <span className="block truncate text-xs text-on-surface-variant">{action.helper}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </Card>
      </section>
    </div>
  );
}

export default StudentDashboard;
