import { ArrowRight, CalendarDays, Clock, MapPin } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../../../components/Card";
import StatusBadge from "../../../components/StatusBadge";
import { useAuth } from "../../../context/useAuth";
import type { StatusType } from "../../../data/mockData";
import {
  studentActivities,
  studentCertificates,
  studentExams,
  studentMetrics,
  studentQuickActions,
  toneClass,
} from "../../../data/studentPortalData";
import { notificationApi, userApi, type NotificationResponse } from "../../../services/api";

type DashboardNotice = {
  id: string;
  title: string;
  source: string;
  time: string;
  priority: StatusType;
};

const formatDateTime = (value?: string) => {
  if (!value) return "Vua cap nhat";
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
  source: item.createdBy || "Phong Cong tac sinh vien",
  time: formatDateTime(item.startDate || item.createdAt),
  priority: item.priority as StatusType,
});

const getNoticeTime = (item: NotificationResponse) => {
  const time = new Date(item.startDate || item.createdAt || "").getTime();
  return Number.isNaN(time) ? 0 : time;
};

const priorityRank = (item: NotificationResponse) => (item.priority === "URGENT" ? 0 : 1);

const sortDashboardNotices = (items: NotificationResponse[]) =>
  [...items].sort((left, right) => priorityRank(left) - priorityRank(right) || getNoticeTime(right) - getNoticeTime(left));

function StudentDashboard() {
  const { username } = useAuth();
  const [notices, setNotices] = useState<DashboardNotice[]>([]);
  const [noticeMessage, setNoticeMessage] = useState("");
  const [noticeLoading, setNoticeLoading] = useState(false);
  const nextExam = studentExams.find((exam) => exam.status === "ACTIVE") ?? studentExams[0];
  const nextActivity = studentActivities[0];
  const latestCertificate = studentCertificates[0];

  const loadNotifications = useCallback(async () => {
    setNoticeLoading(true);
    setNoticeMessage("");

    try {
      const profile = username ? await userApi.getByStudentId(username) : null;
      const data = await notificationApi.listMine({
        facultyId: profile?.clazz?.faculty?.facultyCode || profile?.clazz?.faculty?.facultyName || "",
        classId: profile?.clazz?.classCode || (profile?.clazz?.id ? String(profile.clazz.id) : ""),
      });
      setNotices(sortDashboardNotices(data).slice(0, 3).map(toDashboardNotice));
    } catch (err) {
      setNotices([]);
      setNoticeMessage(err instanceof Error ? err.message : "Khong tai duoc thong bao tu notification-service.");
    } finally {
      setNoticeLoading(false);
    }
  }, [username]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadNotifications();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadNotifications]);

  return (
    <div className="space-y-gutter">
      <section className="grid gap-gutter xl:grid-cols-[1fr_360px]">
        <div className="rounded-lg bg-primary px-6 py-7 text-on-primary shadow-panel">
          <p className="text-sm font-semibold text-on-primary-container">Cổng sinh viên STU</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">Xin chào, {username || "sinh viên"}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-on-primary-container">
            Theo dõi hồ sơ cá nhân, kỳ thi bắt buộc, hoạt động ngoại khóa và các yêu cầu giấy xác nhận tại một nơi.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 font-semibold text-primary" to="/student/profile">
              Kiểm tra hồ sơ
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-4 py-3 font-semibold text-white" to="/student/notifications">
              Xem thông báo
            </Link>
          </div>
        </div>

        <Card className="flex flex-col justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Việc cần chú ý</p>
            <h2 className="mt-2 text-xl font-bold text-on-surface">{nextExam.title}</h2>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">{nextExam.requirement}</p>
          </div>
          <div className="mt-5 space-y-3 text-sm text-on-surface-variant">
            <p className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {nextExam.duration}
            </p>
            <p className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {nextExam.window}
            </p>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {studentMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-on-surface-variant">{metric.label}</p>
                  <p className="mt-3 text-3xl font-bold text-on-surface">{metric.value}</p>
                  <p className="mt-1 text-sm text-on-surface-variant">{metric.helper}</p>
                </div>
                <div className={`rounded-lg p-3 ${toneClass[metric.tone]}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </Card>
          );
        })}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-primary">Lối tắt</p>
            <h2 className="text-2xl font-bold text-on-surface">Tác vụ thường dùng</h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {studentQuickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.path}
                className="panel flex min-h-36 flex-col justify-between p-5 transition hover:-translate-y-0.5 hover:shadow-raised"
                to={action.path}
              >
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

      <section className="grid gap-gutter xl:grid-cols-[1.2fr_0.8fr]">
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
            {noticeLoading && <p className="py-4 text-sm font-semibold text-on-surface-variant">Dang tai thong bao...</p>}

            {!noticeLoading && noticeMessage && <p className="py-4 text-sm font-semibold text-primary">{noticeMessage}</p>}

            {!noticeLoading && !noticeMessage && notices.length === 0 && (
              <p className="py-4 text-sm font-semibold text-on-surface-variant">Chua co thong bao phu hop voi tai khoan cua ban.</p>
            )}

            {!noticeLoading && !noticeMessage && notices.map((notice) => (
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
            <p className="text-sm font-semibold text-primary">Hoạt động sắp tới</p>
            <h2 className="mt-2 text-xl font-bold text-on-surface">{nextActivity.title}</h2>
            <div className="mt-4 space-y-2 text-sm text-on-surface-variant">
              <p className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                {nextActivity.date} · {nextActivity.time}
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {nextActivity.location}
              </p>
            </div>
          </Card>
          <Card>
            <p className="text-sm font-semibold text-primary">Đơn xác nhận gần nhất</p>
            <h2 className="mt-2 text-xl font-bold text-on-surface">{latestCertificate.type}</h2>
            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-sm text-on-surface-variant">{latestCertificate.code}</p>
              <StatusBadge status={latestCertificate.status} />
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

export default StudentDashboard;
