import { CheckCheck, Eye, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../../../components/Card";
import FilterBar from "../../../components/FilterBar";
import PageHeader from "../../../components/PageHeader";
import PaginationControls from "../../../components/PaginationControls";
import StatusBadge from "../../../components/StatusBadge";
import { useAuth } from "../../../context/useAuth";
import type { StatusType } from "../../../data/mockData";
import type { StudentNotice } from "../../../data/studentPortalData";
import { usePaginatedList } from "../../../hooks/usePaginatedList";
import { notificationApi, type NotificationResponse } from "../../../services/api";
import { stripHtmlToText } from "../../../utils/html";
import { getStoredReadNotificationIds, rememberReadNotification } from "../../../utils/notificationReadState";
import { includesSearch } from "../../../utils/search";

const formatDateTime = (value?: string) => {
  if (!value) return "Vừa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16).replace("T", " ");
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

const toNotice = (item: NotificationResponse, readIds = new Set<string>()): StudentNotice => ({
  id: item.id,
  title: item.title,
  content: item.content,
  attachmentUrl: item.attachmentUrl,
  source: item.createdBy || "Phòng Công tác sinh viên",
  time: formatDateTime(item.startDate),
  endTime: formatDateTime(item.endDate),
  priority: item.priority as StatusType,
  isRead: Boolean(item.isRead || readIds.has(String(item.id))),
  fromApi: true,
});

function StudentNotificationsPage() {
  const { username } = useAuth();
  const [notices, setNotices] = useState<StudentNotice[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [readFilter, setReadFilter] = useState("");

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const data = await notificationApi.listMine();
      const readIds = getStoredReadNotificationIds(username);
      setNotices(data.map((item) => toNotice(item, readIds)));
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
      rememberReadNotification(username, notice.id);
      setNotices((current) => current.map((item) => (item.id === notice.id ? { ...item, isRead: true } : item)));
      return;
    }

    try {
      await notificationApi.markAsRead(notice.id);
      rememberReadNotification(username, notice.id);
      setNotices((current) => current.map((item) => (item.id === notice.id ? { ...item, isRead: true } : item)));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không đánh dấu đã đọc được.");
    }
  };

  const filteredNotices = useMemo(
    () =>
      notices.filter((notice) => {
        const matchesKeyword = includesSearch(`${notice.title} ${stripHtmlToText(notice.content)} ${notice.source}`, keyword);
        const matchesPriority = !priorityFilter || notice.priority === priorityFilter;
        const matchesRead =
          !readFilter
          || (readFilter === "READ" && notice.isRead)
          || (readFilter === "UNREAD" && !notice.isRead);
        return matchesKeyword && matchesPriority && matchesRead;
      }),
    [keyword, notices, priorityFilter, readFilter],
  );

  const {
    pageItems: paginatedNotices,
    pageIndex,
    pageSize,
    totalItems,
    setPageIndex,
    setPageSize,
  } = usePaginatedList(filteredNotices);

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
              Đang tải thông báo mới nhất dành cho tài khoản của bạn.
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

      <FilterBar
        filters={[
          {
            id: "priority",
            label: "Độ ưu tiên",
            value: priorityFilter,
            onChange: setPriorityFilter,
            options: [
              { value: "", label: "Tất cả độ ưu tiên" },
              { value: "URGENT", label: "Cấp bách" },
              { value: "NORMAL", label: "Bình thường" },
            ],
          },
          {
            id: "read",
            label: "Trạng thái đọc",
            value: readFilter,
            onChange: setReadFilter,
            options: [
              { value: "", label: "Tất cả" },
              { value: "UNREAD", label: "Chưa đọc" },
              { value: "READ", label: "Đã đọc" },
            ],
          },
        ]}
        onReset={() => {
          setKeyword("");
          setPriorityFilter("");
          setReadFilter("");
        }}
        onSearchChange={setKeyword}
        resultText={`Hiển thị ${filteredNotices.length} / ${notices.length} thông báo`}
        searchPlaceholder="Nhập tiêu đề, nội dung hoặc nguồn gửi"
        searchValue={keyword}
        title="Lọc thông báo"
      />

      {!loading && filteredNotices.length === 0 && (
        <Card>
          <p className="font-semibold text-on-surface">
            {notices.length === 0 ? "Chưa có thông báo phù hợp với tài khoản của bạn." : "Không tìm thấy thông báo phù hợp."}
          </p>
          <p className="mt-2 text-sm text-on-surface-variant">
            Thử đổi từ khóa hoặc xóa bộ lọc để xem thêm thông báo.
          </p>
        </Card>
      )}

      <div className="space-y-4">
        {paginatedNotices.map((notice) => {
          const preview = stripHtmlToText(notice.content) || "Bấm xem chi tiết để đọc toàn bộ nội dung thông báo.";

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
                    {notice.isRead ? "Đã đọc" : "Đánh dấu đã đọc"}
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {!loading && filteredNotices.length > 0 && (
        <PaginationControls
          itemLabel="thông báo"
          onPageChange={setPageIndex}
          onPageSizeChange={setPageSize}
          pageIndex={pageIndex}
          pageSize={pageSize}
          totalItems={totalItems}
        />
      )}
    </div>
  );
}

export default StudentNotificationsPage;
