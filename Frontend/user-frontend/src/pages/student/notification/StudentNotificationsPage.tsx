import { CheckCheck, Eye, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../../../components/Card";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import { useAuth } from "../../../context/useAuth";
import type { StatusType } from "../../../data/mockData";
import type { StudentNotice } from "../../../data/studentPortalData";
import { notificationApi, userApi, type NotificationResponse, type UserProfile } from "../../../services/api";

const stripHtml = (value = "") => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const formatDateTime = (value?: string) => {
  if (!value) return "Vừa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16).replace("T", " ");
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

const toNotice = (item: NotificationResponse): StudentNotice => ({
  id: item.id,
  title: item.title,
  content: item.content,
  attachmentUrl: item.attachmentUrl,
  source: item.createdBy || "Phòng Công tác sinh viên",
  time: formatDateTime(item.startDate),
  endTime: formatDateTime(item.endDate),
  priority: item.priority as StatusType,
  isRead: Boolean(item.isRead),
  fromApi: true,
});

function StudentNotificationsPage() {
  const { username } = useAuth();
  const [notices, setNotices] = useState<StudentNotice[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const currentProfile = username ? await userApi.getByStudentId(username) : null;
      const data = await notificationApi.listMineForProfile(currentProfile);
      setProfile(currentProfile);
      setNotices(data.map(toNotice));
    } catch (err) {
      setNotices([]);
      setMessage(err instanceof Error ? err.message : "Không tải được thông báo.");
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadNotifications();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadNotifications]);

  const markAsRead = async (notice: StudentNotice) => {
    if (!notice.fromApi) {
      setNotices((current) => current.map((item) => (item.id === notice.id ? { ...item, isRead: true } : item)));
      return;
    }

    try {
      await notificationApi.markAsRead(notice.id);
      setNotices((current) => current.map((item) => (item.id === notice.id ? { ...item, isRead: true } : item)));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không đánh dấu đã đọc được.");
    }
  };

  return (
    <div className="space-y-gutter">
      <PageHeader
        title="Thông báo sinh viên"
        subtitle="Xem thông báo cá nhân, thông báo toàn trường và thông báo theo lớp/khoa."
      />

      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">{notices.filter((item) => !item.isRead).length} thông báo chưa đọc</p>
            <h2 className="text-xl font-bold text-on-surface">Hộp thư thông báo</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Đang tải thông báo mới nhất
              {profile?.clazz?.classCode ? ` · Lớp ${profile.clazz.classCode}` : ""}
              {profile?.clazz?.faculty?.facultyCode ? ` · Khoa ${profile.clazz.faculty.facultyCode}` : ""}
            </p>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary"
            onClick={loadNotifications}
            type="button"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
            Tải lại
          </button>
        </div>
      </Card>

      {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">{message}</div>}

      {!loading && notices.length === 0 && (
        <Card>
          <p className="font-semibold text-on-surface">Chưa có thông báo phù hợp với tài khoản của bạn.</p>
          <p className="mt-2 text-sm text-on-surface-variant">
            Service chỉ trả các thông báo đang `PUBLISHED`, còn hạn, và có target là `ALL`, đúng `USER`, đúng `CLASS` hoặc đúng `FACULTY`.
          </p>
        </Card>
      )}

      <div className="space-y-4">
        {notices.map((notice) => {
          const preview = stripHtml(notice.content) || "Bấm xem chi tiết để đọc toàn bộ nội dung thông báo.";

          return (
            <Card key={notice.id} className={notice.isRead ? "opacity-80" : ""}>
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
                <Link className="group flex gap-4" to={`/student/notifications/${notice.id}`}>
                  <span className={`mt-2 h-3 w-3 flex-shrink-0 rounded-full ${notice.isRead ? "bg-outline-variant" : "bg-primary"}`} />
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-bold text-on-surface group-hover:text-primary">{notice.title}</h2>
                      <StatusBadge status={notice.priority} />
                    </div>
                    <p className="text-sm text-on-surface-variant">
                      {notice.source} · {notice.time}
                    </p>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-on-surface-variant">{preview}</p>
                  </div>
                </Link>
                <div className="flex flex-wrap justify-end gap-2">
                  <Link
                    className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-primary hover:bg-surface-container-low"
                    to={`/student/notifications/${notice.id}`}
                  >
                    <Eye className="h-4 w-4" />
                    Xem
                  </Link>
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-primary hover:bg-surface-container-low disabled:text-on-surface-variant"
                    disabled={notice.isRead}
                    onClick={() => void markAsRead(notice)}
                    type="button"
                  >
                    <CheckCheck className="h-4 w-4" />
                    {notice.isRead ? "Đã đọc" : "Đã đọc"}
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default StudentNotificationsPage;
