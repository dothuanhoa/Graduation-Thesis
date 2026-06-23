import { FileText, MoreVertical } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../../../components/Card";
import DataTable, { type Column } from "../../../components/DataTable";
import PageHeader from "../../../components/PageHeader";
import StatCard from "../../../components/StatCard";
import StatusBadge from "../../../components/StatusBadge";
import { adminStats, certificates, upcomingActivities, type TableRow } from "../../../data/mockData";
import { notificationApi, userApi, type NotificationResponse, type UserProfile } from "../../../services/api";

const certificateColumns: Column<TableRow>[] = [
  { header: "Mã đơn", key: "code" },
  { header: "Sinh viên", key: "student" },
  { header: "Loại giấy", key: "type" },
  { header: "Ngày gửi", key: "createdAt" },
  { header: "Trạng thái", key: "status" },
];

const formatNumber = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

const isPublishedNotification = (item: NotificationResponse) => item.status === "PUBLISHED";

const isUrgentNotification = (item: NotificationResponse) => item.priority === "URGENT";

function AdminDashboard() {
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsMessage, setStatsMessage] = useState("");

  const loadDashboardStats = useCallback(async () => {
    setLoadingStats(true);
    setStatsMessage("");

    try {
      const [studentData, notificationData] = await Promise.all([userApi.list(), notificationApi.listAdmin()]);
      setStudents(studentData);
      setNotifications(notificationData);
    } catch (err) {
      setStudents([]);
      setNotifications([]);
      setStatsMessage(err instanceof Error ? err.message : "Khong tai duoc du lieu tong quan tu service.");
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadDashboardStats();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadDashboardStats]);

  const publishedNotifications = notifications.filter(isPublishedNotification);
  const urgentNotifications = notifications.filter(isUrgentNotification);
  const urgentPublishedNotifications = publishedNotifications.filter(isUrgentNotification);

  const dashboardStats = useMemo(
    () =>
      adminStats.map((stat, index) => {
        if (index === 0) {
          return {
            ...stat,
            path: "/admin/students",
            value: loadingStats ? "..." : formatNumber(students.length),
            trend: "Tu user-service",
          };
        }

        if (index === 1) {
          return {
            ...stat,
            path: "/admin/notifications",
            value: loadingStats ? "..." : formatNumber(notifications.length),
            trend: `${formatNumber(urgentNotifications.length)} cap bach`,
          };
        }

        return stat;
      }),
    [loadingStats, notifications.length, students.length, urgentNotifications.length],
  );

  return (
    <>
      <PageHeader
        title="Tổng quan hệ thống"
        subtitle="Cập nhật tình hình hoạt động và xử lý đơn từ sinh viên."
      />
      <section className="grid gap-gutter md:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((stat) =>
          "path" in stat && stat.path ? (
            <Link key={stat.label} className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" to={stat.path}>
              <StatCard {...stat} />
            </Link>
          ) : (
            <StatCard key={stat.label} {...stat} />
          ),
        )}
      </section>
      {statsMessage && <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">{statsMessage}</div>}
      <section className="grid gap-gutter xl:grid-cols-[2fr_1fr]">
        <Card className="min-h-[360px]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-on-surface">Tình hình xử lý đơn từ</h2>
            <button className="font-semibold text-primary" type="button">Xem chi tiết</button>
          </div>
          <div className="mt-8 space-y-6">
            {["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"].map((week, index) => (
              <div key={week}>
                <div className="mb-2 flex items-center justify-between text-sm text-on-surface-variant">
                  <span>{week}</span>
                  <span>{38 + index * 12} đơn</span>
                </div>
                <div className="h-3 rounded-full bg-surface-container">
                  <div className="h-3 rounded-full bg-primary" style={{ width: `${45 + index * 12}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-on-surface">Hoạt động sắp diễn ra</h2>
            <MoreVertical className="h-5 w-5 text-on-surface-variant" />
          </div>
          <div className="space-y-5">
            {upcomingActivities.map((activity) => (
              <article key={activity.title} className="flex gap-4">
                <div className="flex h-20 w-16 flex-shrink-0 flex-col items-center justify-center rounded-lg bg-primary-fixed font-bold text-primary">
                  <span className="text-xl">{activity.date}</span>
                  <span className="text-xs">{activity.month}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-bold text-on-surface">{activity.title}</h3>
                  <p className="mt-1 text-sm text-on-surface-variant">{activity.time}</p>
                  <span className="mt-2 inline-flex rounded-full bg-surface-container-high px-3 py-1 text-xs text-on-surface-variant">
                    {activity.capacity}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </Card>
      </section>
      <DataTable columns={certificateColumns} rows={certificates} caption="Đơn giấy xác nhận chờ xử lý" />
      <Card>
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-primary-fixed p-3 text-primary">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-on-surface">Cảnh báo vận hành</h2>
            <p className="mt-2 text-on-surface-variant">
              Co {formatNumber(urgentPublishedNotifications.length)} thong bao cap bach dang xuat ban tren notification-service va tong cong {formatNumber(students.length)} sinh vien tren user-service.
            </p>
            <div className="mt-3">
              <StatusBadge status="URGENT" />
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}

export default AdminDashboard;
