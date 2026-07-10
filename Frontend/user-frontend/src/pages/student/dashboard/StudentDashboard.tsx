import { ArrowRight, Bell, CalendarCheck, CalendarDays, ClipboardCheck, FileCheck2, MapPin, QrCode, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { Link } from "react-router-dom";
import Card from "../../../components/Card";
import StatusBadge from "../../../components/StatusBadge";
import { useAuth } from "../../../context/useAuth";
import type { StatusType } from "../../../data/mockData";
import { activityApi, notificationApi, userApi, type ActivityResponse, type NotificationResponse } from "../../../services/api";
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
  const [notices, setNotices] = useState<DashboardNotice[]>([]);
  const [activities, setActivities] = useState<ActivityResponse[]>([]);
  const [scanActivities, setScanActivities] = useState<ActivityResponse[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const profile = username ? await userApi.getByStudentId(username) : null;
      const [notificationData, activityData, checkerActivityData] = await Promise.all([
        notificationApi.listMine({
          facultyId: profile?.clazz?.faculty?.facultyCode || profile?.clazz?.faculty?.facultyName || "",
          classId: profile?.clazz?.classCode || (profile?.clazz?.id ? String(profile.clazz.id) : ""),
        }),
        activityApi.list(),
        activityApi.listMyCheckerActivities(),
      ]);

      setNotices(sortDashboardNotices(notificationData).slice(0, 3).map(toDashboardNotice));
      setActivities(activityData);
      setScanActivities(checkerActivityData);
    } catch (err) {
      setNotices([]);
      setActivities([]);
      setScanActivities([]);
      setMessage(err instanceof Error ? err.message : "Không tải được dữ liệu tổng quan.");
    } finally {
      setLoading(false);
    }
  }, [username]);

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
  const visibleQuickActions = quickActions;

  return (
    <div className="space-y-gutter">
      <section className="grid gap-gutter xl:grid-cols-[1fr_340px]">
        <div className="rounded-lg bg-primary px-6 py-7 text-on-primary shadow-panel">
          <p className="text-sm font-semibold text-on-primary-container">Cổng sinh viên STU</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">Xin chào, {username || "sinh viên"}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-on-primary-container">
            Theo dõi hồ sơ, thông báo, hoạt động ngoại khóa và các yêu cầu giấy tờ trong một không gian thống nhất.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 font-semibold text-primary" to="/student/profile">
              Kiểm tra hồ sơ
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-4 py-3 font-semibold text-white" to="/checker/scan">
              <QrCode className="h-4 w-4" />
              Quét điểm danh
            </Link>
          </div>
        </div>

        <Card className="flex flex-col justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Việc cần chú ý</p>
            <h2 className="mt-2 text-xl font-bold text-on-surface">
              {urgentNotices[0]?.title || nextActivity?.title || "Chưa có việc cần xử lý"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              {urgentNotices.length > 0
                ? "Ưu tiên đọc thông báo cấp bách trước khi tiếp tục các tác vụ khác."
                : nextActivity
                  ? "Kiểm tra thời gian và địa điểm để chủ động tham gia đúng hạn."
                  : "Các mục cần chú ý sẽ xuất hiện khi có thông báo hoặc hoạt động mới."}
            </p>
          </div>
          {nextActivity && (
            <div className="mt-5 space-y-3 text-sm text-on-surface-variant">
              <p className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                {formatActivityRange(nextActivity.startTime, nextActivity.endTime)}
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {nextActivity.location || "Chưa cập nhật địa điểm"}
              </p>
            </div>
          )}
        </Card>
      </section>

      {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">{message}</div>}

      <section className="grid gap-4 md:grid-cols-3">
        <Link className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" to="/student/notifications">
          <Card className="h-full">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-on-surface-variant">Thông báo mới</p>
                <p className="mt-3 text-3xl font-bold text-on-surface">{loading ? "..." : notices.length}</p>
                <p className="mt-1 text-sm text-on-surface-variant">{urgentNotices.length} cấp bách</p>
              </div>
              <div className="rounded-lg bg-primary-fixed p-3 text-primary">
                <Bell className="h-6 w-6" />
              </div>
            </div>
          </Card>
        </Link>

        <Link className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" to="/student/activities">
          <Card className="h-full">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-on-surface-variant">Hoạt động đang mở</p>
                <p className="mt-3 text-3xl font-bold text-on-surface">{loading ? "..." : ongoingActivities.length}</p>
                <p className="mt-1 text-sm text-on-surface-variant">Xem danh sách hoạt động</p>
              </div>
              <div className="rounded-lg bg-emerald-100 p-3 text-emerald-700">
                <CalendarCheck className="h-6 w-6" />
              </div>
            </div>
          </Card>
        </Link>

        <Link className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" to="/checker/scan">
          <Card className="h-full">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-on-surface-variant">Điểm danh</p>
                <p className="mt-3 text-3xl font-bold text-on-surface">{loading ? "..." : scanActivities.length}</p>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {canScanAttendance ? "Hoạt động được phân quyền" : "Mở màn hình quét mã"}
                </p>
              </div>
              <div className="rounded-lg bg-orange-100 p-3 text-orange-800">
                <QrCode className="h-6 w-6" />
              </div>
            </div>
          </Card>
        </Link>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-sm font-semibold text-primary">Lối tắt</p>
          <h2 className="text-2xl font-bold text-on-surface">Tác vụ thường dùng</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {visibleQuickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.path} className="panel flex min-h-32 flex-col justify-between p-5 transition hover:-translate-y-0.5 hover:shadow-raised" to={action.path}>
                <div className="flex items-center justify-between gap-4">
                  <div className="rounded-lg bg-primary-fixed p-3 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-on-surface-variant" />
                </div>
                <div>
                  <h3 className="font-bold text-on-surface">{action.title}</h3>
                  <p className="mt-1 text-sm text-on-surface-variant">{action.helper}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-gutter xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-primary">Thông báo</p>
              <h2 className="text-xl font-bold text-on-surface">Tin mới từ nhà trường</h2>
            </div>
            <Link className="text-sm font-semibold text-primary" to="/student/notifications">
              Xem tất cả
            </Link>
          </div>
          <div className="divide-y divide-outline-variant">
            {loading && <p className="py-4 text-sm font-semibold text-on-surface-variant">Đang tải thông báo...</p>}

            {!loading && notices.length === 0 && (
              <p className="py-4 text-sm font-semibold text-on-surface-variant">Chưa có thông báo phù hợp với tài khoản của bạn.</p>
            )}

            {!loading &&
              notices.map((notice) => (
                <article key={notice.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link className="font-bold text-on-surface hover:text-primary" to={`/student/notifications/${notice.id}`}>
                        {notice.title}
                      </Link>
                      <p className="mt-1 text-sm text-on-surface-variant">
                        {notice.source} · {notice.time}
                      </p>
                    </div>
                    <StatusBadge status={notice.priority} />
                  </div>
                </article>
              ))}
          </div>
        </Card>

        <div className="space-y-gutter">
          <Card>
            <p className="text-sm font-semibold text-primary">Hoạt động gần nhất</p>
            {nextActivity ? (
              <>
                <h2 className="mt-2 text-xl font-bold text-on-surface">{nextActivity.title}</h2>
                <div className="mt-4 space-y-2 text-sm text-on-surface-variant">
                  <p className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    {formatActivityRange(nextActivity.startTime, nextActivity.endTime)}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {nextActivity.location || "Chưa cập nhật địa điểm"}
                  </p>
                </div>
                <Link className="mt-5 inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" to={`/student/activities/${nextActivity.id}`}>
                  Xem chi tiết
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            ) : (
              <p className="mt-3 text-sm text-on-surface-variant">Chưa có hoạt động sắp diễn ra.</p>
            )}
          </Card>
          <Card>
            <p className="text-sm font-semibold text-primary">Đơn xác nhận</p>
            <h2 className="mt-2 text-xl font-bold text-on-surface">Gửi yêu cầu giấy tờ</h2>
            <p className="mt-3 text-sm text-on-surface-variant">Theo dõi trạng thái xử lý và lịch nhận giấy xác nhận.</p>
            <Link className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary" to="/student/certificates/new">
              <ClipboardCheck className="h-5 w-5" />
              Tạo yêu cầu
            </Link>
          </Card>
        </div>
      </section>
    </div>
  );
}

export default StudentDashboard;
