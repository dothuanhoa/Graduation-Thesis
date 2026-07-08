import { Bell, CalendarCheck, ClipboardPlus, Plus, QrCode, RefreshCw, Send, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { Link } from "react-router-dom";
import Card from "../../../components/Card";
import PageHeader from "../../../components/PageHeader";
import StatCard from "../../../components/StatCard";
import StatusBadge from "../../../components/StatusBadge";
import { activityApi, notificationApi, userApi, type ActivityResponse, type NotificationResponse, type UserProfile } from "../../../services/api";
import { formatActivityRange } from "../../../utils/activityUi";

type QuickLink = {
  title: string;
  helper: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
};

const formatNumber = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

const formatDateTime = (value?: string) => {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace("T", " ");
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(date);
};

const quickLinks: QuickLink[] = [
  { title: "Thêm sinh viên", helper: "Tạo hồ sơ và tài khoản đăng nhập", path: "/admin/students/new", icon: Plus },
  { title: "Import sinh viên", helper: "Nạp danh sách từ Excel", path: "/admin/students/import", icon: ClipboardPlus },
  { title: "Tạo thông báo", helper: "Gửi tin đến sinh viên", path: "/admin/notifications/new", icon: Send },
  { title: "Quét điểm danh", helper: "Mở màn hình scan hoạt động", path: "/checker/scan", icon: QrCode },
];

function AdminDashboard() {
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [activities, setActivities] = useState<ActivityResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const [studentData, notificationData, activityData] = await Promise.all([
        userApi.list(),
        notificationApi.listAdmin(),
        activityApi.list(),
      ]);
      setStudents(studentData);
      setNotifications(notificationData);
      setActivities(activityData);
    } catch (err) {
      setStudents([]);
      setNotifications([]);
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

  const publishedNotifications = notifications.filter((item) => item.status === "PUBLISHED");
  const urgentNotifications = notifications.filter((item) => item.priority === "URGENT");
  const ongoingActivities = activities.filter((item) => item.status === "ONGOING");
  const upcomingActivities = activities.filter((item) => item.status === "UPCOMING");
  const registeredCount = activities.reduce((total, activity) => total + (activity.registrationCount ?? 0), 0);
  const attendedCount = activities.reduce((total, activity) => total + (activity.attendedCount ?? 0), 0);

  const stats = useMemo(
    () => [
      {
        label: "Sinh viên",
        value: loading ? "..." : formatNumber(students.length),
        trend: "Hồ sơ",
        icon: Users,
        tone: "primary",
        path: "/admin/students",
      },
      {
        label: "Thông báo",
        value: loading ? "..." : formatNumber(notifications.length),
        trend: `${formatNumber(publishedNotifications.length)} đang hiển thị`,
        icon: Bell,
        tone: "info",
        path: "/admin/notifications",
      },
      {
        label: "Hoạt động",
        value: loading ? "..." : formatNumber(activities.length),
        trend: `${formatNumber(ongoingActivities.length)} đang diễn ra`,
        icon: CalendarCheck,
        tone: "success",
        path: "/admin/activities",
      },
      {
        label: "Điểm danh",
        value: loading ? "..." : `${formatNumber(attendedCount)}/${formatNumber(registeredCount)}`,
        trend: "Đã quét",
        icon: QrCode,
        tone: "warning",
        path: "/checker/scan",
      },
    ],
    [
      activities.length,
      attendedCount,
      loading,
      notifications.length,
      ongoingActivities.length,
      publishedNotifications.length,
      registeredCount,
      students.length,
    ],
  );

  const visibleActivities = [...ongoingActivities, ...upcomingActivities]
    .sort((left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime())
    .slice(0, 4);

  const latestNotifications = [...notifications]
    .sort((left, right) => new Date(right.createdAt || right.startDate).getTime() - new Date(left.createdAt || left.startDate).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-gutter">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <PageHeader
          title="Tổng quan hệ thống"
          subtitle="Theo dõi nhanh sinh viên, thông báo, hoạt động và tình hình điểm danh trong ngày."
        />
        <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" onClick={loadDashboard} type="button">
          <RefreshCw className="h-5 w-5" />
          Làm mới
        </button>
      </div>

      {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">{message}</div>}

      <section className="grid gap-gutter md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" to={stat.path}>
            <StatCard {...stat} />
          </Link>
        ))}
      </section>

      <section>
        <div className="mb-4">
          <p className="text-sm font-semibold text-primary">Lối tắt</p>
          <h2 className="text-2xl font-bold text-on-surface">Tác vụ thường dùng</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.path} className="panel flex min-h-32 flex-col justify-between p-5 transition hover:-translate-y-0.5 hover:shadow-raised" to={item.path}>
                <div className="flex items-center justify-between gap-4">
                  <div className="rounded-lg bg-primary-fixed p-3 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-semibold text-primary">Mở</span>
                </div>
                <div>
                  <h3 className="font-bold text-on-surface">{item.title}</h3>
                  <p className="mt-1 text-sm text-on-surface-variant">{item.helper}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-gutter xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-primary">Hoạt động</p>
              <h2 className="text-xl font-bold text-on-surface">Đang cần theo dõi</h2>
            </div>
            <Link className="text-sm font-semibold text-primary" to="/admin/activities">
              Xem tất cả
            </Link>
          </div>
          <div className="divide-y divide-outline-variant">
            {visibleActivities.length === 0 ? (
              <p className="py-4 text-sm text-on-surface-variant">Chưa có hoạt động đang diễn ra hoặc sắp diễn ra.</p>
            ) : (
              visibleActivities.map((activity) => (
                <article key={activity.id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div>
                    <Link className="font-bold text-on-surface hover:text-primary" to={`/admin/activities/${activity.id}`}>
                      {activity.title}
                    </Link>
                    <p className="mt-1 text-sm text-on-surface-variant">{formatActivityRange(activity.startTime, activity.endTime)}</p>
                  </div>
                  <StatusBadge status={activity.status} />
                </article>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-primary">Thông báo</p>
              <h2 className="text-xl font-bold text-on-surface">Tin mới quản trị</h2>
            </div>
            <Link className="text-sm font-semibold text-primary" to="/admin/notifications">
              Quản lý
            </Link>
          </div>
          <div className="divide-y divide-outline-variant">
            {latestNotifications.length === 0 ? (
              <p className="py-4 text-sm text-on-surface-variant">Chưa có thông báo.</p>
            ) : (
              latestNotifications.map((notification) => (
                <article key={notification.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-on-surface">{notification.title}</h3>
                      <p className="mt-1 text-sm text-on-surface-variant">{formatDateTime(notification.createdAt || notification.startDate)}</p>
                    </div>
                    <StatusBadge status={notification.priority} />
                  </div>
                </article>
              ))
            )}
          </div>
        </Card>
      </section>

      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Cần chú ý</p>
            <h2 className="text-xl font-bold text-on-surface">Có {formatNumber(urgentNotifications.length)} thông báo cấp bách</h2>
            <p className="mt-2 text-sm text-on-surface-variant">Kiểm tra nội dung và thời hạn hiển thị để bảo đảm sinh viên nhận được thông tin đúng lúc.</p>
          </div>
          <Link className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary" to="/admin/notifications">
            <Bell className="h-5 w-5" />
            Xem thông báo
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default AdminDashboard;
