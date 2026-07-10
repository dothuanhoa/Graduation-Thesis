import { ArrowLeft, CheckCheck, ExternalLink, Paperclip, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Card from "../../../components/Card";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import { useAuth } from "../../../context/useAuth";
import type { StatusType } from "../../../data/mockData";
import type { StudentNotice } from "../../../data/studentPortalData";
import { notificationApi, userApi, type NotificationResponse } from "../../../services/api";

const formatDateTime = (value?: string) => {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16).replace("T", " ");
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
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

function StudentNotificationDetailPage() {
  const { id } = useParams();
  const { username } = useAuth();
  const notificationId = useMemo(() => id || "", [id]);
  const [notice, setNotice] = useState<StudentNotice | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadNotification = useCallback(async () => {
    if (!notificationId) {
      setMessage("Mã thông báo không hợp lệ.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const currentProfile = username ? await userApi.getByStudentId(username) : null;
      const data = await notificationApi.listMineForProfile(currentProfile);
      const found = data.map(toNotice).find((item) => item.id === notificationId);
      const selected = found ?? null;

      setNotice(selected);

      if (!selected) {
        setMessage("Không tìm thấy thông báo hoặc thông báo đã hết hạn.");
        return;
      }

      if (selected.fromApi && !selected.isRead) {
        await notificationApi.markAsRead(selected.id);
        setNotice({ ...selected, isRead: true });
      }
    } catch (err) {
      setNotice(null);
      setMessage(err instanceof Error ? err.message : "Không tải được chi tiết thông báo.");
    } finally {
      setLoading(false);
    }
  }, [notificationId, username]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadNotification();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadNotification]);

  const markAsRead = async () => {
    if (!notice || notice.isRead) return;

    try {
      if (notice.fromApi) {
        await notificationApi.markAsRead(notice.id);
      }
      setNotice({ ...notice, isRead: true });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không đánh dấu đã đọc được.");
    }
  };

  return (
    <div className="space-y-gutter">
      <PageHeader
        title="Chi tiết thông báo"
        subtitle="Đọc nội dung thông báo và kiểm tra thời hạn áp dụng."
      />

      <div className="flex flex-wrap gap-3">
        <Link className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" to="/student/notifications">
          <ArrowLeft className="h-5 w-5" />
          Quay lại
        </Link>
        <button className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" onClick={loadNotification} type="button">
          <RefreshCw className="h-5 w-5" />
          Tải lại
        </button>
      </div>

      {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">{message}</div>}

      {loading ? (
        <div className="panel p-6 text-on-surface-variant">Đang tải chi tiết thông báo...</div>
      ) : notice ? (
        <section className="grid gap-gutter xl:grid-cols-[1fr_340px]">
          <Card>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <StatusBadge status={notice.priority} />
              <StatusBadge status={notice.isRead ? "COMPLETED" : "PUBLISHED"} />
            </div>
            <h1 className="text-2xl font-bold leading-tight text-on-surface md:text-3xl">{notice.title}</h1>
            <p className="mt-3 text-sm text-on-surface-variant">
              {notice.source} · Bắt đầu {notice.time}
            </p>
            <div
              className="mt-7 max-w-none rounded-lg border border-outline-variant bg-surface-container-lowest p-5 leading-7 text-on-surface"
              dangerouslySetInnerHTML={{ __html: notice.content || "Thông báo chưa có nội dung chi tiết." }}
            />
          </Card>

          <div className="space-y-gutter">
            <Card>
              <h2 className="text-lg font-bold text-on-surface">Thông tin nhận</h2>
              <dl className="mt-5 space-y-4 text-sm">
                <div>
                  <dt className="font-semibold text-on-surface">Trạng thái đọc</dt>
                  <dd className="mt-1 text-on-surface-variant">{notice.isRead ? "Đã đọc" : "Chưa đọc"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-on-surface">Thời hạn</dt>
                  <dd className="mt-1 text-on-surface-variant">{notice.endTime || "Chưa cập nhật"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-on-surface">Nguồn</dt>
                  <dd className="mt-1 text-on-surface-variant">{notice.source}</dd>
                </div>
              </dl>
              <button
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary disabled:opacity-60"
                disabled={notice.isRead}
                onClick={() => void markAsRead()}
                type="button"
              >
                <CheckCheck className="h-5 w-5" />
                {notice.isRead ? "Đã đọc" : "Đánh dấu đã đọc"}
              </button>
            </Card>

            {notice.attachmentUrl && (
              <Card>
                <h2 className="flex items-center gap-2 text-lg font-bold text-on-surface">
                  <Paperclip className="h-5 w-5 text-primary" />
                  Tệp đính kèm
                </h2>
                <a
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary"
                  href={notice.attachmentUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Mở tệp
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Card>
            )}
          </div>
        </section>
      ) : (
        <Card>
          <p className="text-on-surface-variant">Không có dữ liệu thông báo để hiển thị.</p>
        </Card>
      )}
    </div>
  );
}

export default StudentNotificationDetailPage;
