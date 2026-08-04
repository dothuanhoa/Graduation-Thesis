import { CalendarDays, ClipboardCheck, MapPin, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../../../components/Card";
import FilterBar from "../../../components/FilterBar";
import PageHeader from "../../../components/PageHeader";
import PaginationControls from "../../../components/PaginationControls";
import { usePaginatedList } from "../../../hooks/usePaginatedList";
import { activityApi, type ActivityAttendanceResult, type ActivityRegistrationResponse } from "../../../services/api";
import { formatActivityRange, formatDateTime } from "../../../utils/activityUi";
import { includesSearch } from "../../../utils/search";

const attendanceResultLabels: Record<ActivityAttendanceResult, string> = {
  NOT_ATTENDED: "Vắng",
  FACE_NOT_VERIFIED: "Thiếu xác thực đầu vào",
  INCOMPLETE: "Điểm danh không đủ",
  ATTENDED: "Đã tham gia đủ",
};

const attendanceResultTone: Record<ActivityAttendanceResult, string> = {
  NOT_ATTENDED: "bg-slate-100 text-slate-700",
  FACE_NOT_VERIFIED: "bg-amber-100 text-amber-800",
  INCOMPLETE: "bg-orange-100 text-orange-800",
  ATTENDED: "bg-emerald-100 text-emerald-700",
};

const getResult = (registration: ActivityRegistrationResponse): ActivityAttendanceResult =>
  registration.attendanceResult || (registration.attended ? "ATTENDED" : "NOT_ATTENDED");

function StudentActivityHistoryPage() {
  const [registrations, setRegistrations] = useState<ActivityRegistrationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [keyword, setKeyword] = useState("");
  const [resultFilter, setResultFilter] = useState("");

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const data = await activityApi.listMyRegistrations();
      setRegistrations(data);
    } catch (err) {
      setRegistrations([]);
      setMessage(err instanceof Error ? err.message : "Không tải được lịch sử hoạt động.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadHistory();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadHistory]);

  const filteredRegistrations = useMemo(
    () =>
      registrations.filter((registration) => {
        const result = getResult(registration);
        const matchesKeyword = includesSearch(
          `${registration.activityTitle || ""} ${registration.activityLocation || ""} ${registration.studentCode} ${registration.fullName}`,
          keyword,
        );
        const matchesResult = !resultFilter || result === resultFilter;
        return matchesKeyword && matchesResult;
      }),
    [keyword, registrations, resultFilter],
  );

  const {
    pageItems,
    pageIndex,
    pageSize,
    totalItems,
    setPageIndex,
    setPageSize,
  } = usePaginatedList(filteredRegistrations);

  return (
    <div className="space-y-gutter">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <PageHeader
          title="Lịch sử hoạt động"
          subtitle="Xem lại các hoạt động đã đăng ký và trạng thái điểm danh để làm minh chứng khi cần đối chiếu điểm rèn luyện."
        />
        <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" onClick={() => void loadHistory()} type="button">
          <RefreshCw className="h-5 w-5" />
          Tải lại
        </button>
      </div>

      {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">{message}</div>}

      <FilterBar
        filters={[
          {
            id: "result",
            label: "Kết quả điểm danh",
            value: resultFilter,
            onChange: setResultFilter,
            options: [
              { value: "", label: "Tất cả kết quả" },
              { value: "ATTENDED", label: "Đã tham gia đủ" },
              { value: "INCOMPLETE", label: "Điểm danh không đủ" },
              { value: "FACE_NOT_VERIFIED", label: "Thiếu xác thực đầu vào" },
              { value: "NOT_ATTENDED", label: "Vắng" },
            ],
          },
        ]}
        onReset={() => {
          setKeyword("");
          setResultFilter("");
        }}
        onSearchChange={setKeyword}
        resultText={`Hiển thị ${filteredRegistrations.length} / ${registrations.length} hoạt động đã đăng ký`}
        searchPlaceholder="Nhập tên hoạt động hoặc địa điểm"
        searchValue={keyword}
        title="Lọc lịch sử"
      />

      {loading ? (
        <div className="panel p-6 text-on-surface-variant">Đang tải lịch sử hoạt động...</div>
      ) : filteredRegistrations.length === 0 ? (
        <div className="panel p-6 text-on-surface-variant">
          {registrations.length === 0 ? "Bạn chưa đăng ký hoạt động nào." : "Không tìm thấy lịch sử phù hợp với bộ lọc hiện tại."}
        </div>
      ) : (
        <>
          <div className="grid gap-gutter lg:grid-cols-2">
            {pageItems.map((registration) => {
              const result = getResult(registration);
              const attendanceSessionCount = registration.activityAttendanceSessionCount || 2;
              return (
                <Card key={registration.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-primary">{registration.activityReward || "Hoạt động"}</p>
                      <h2 className="mt-1 text-xl font-bold text-on-surface">{registration.activityTitle || "Hoạt động đã đăng ký"}</h2>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${attendanceResultTone[result]}`}>
                      {attendanceResultLabels[result]}
                    </span>
                  </div>

                  <div className="mt-5 space-y-3 text-sm text-on-surface-variant">
                    <p className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      {formatActivityRange(registration.activityStartTime, registration.activityEndTime)}
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      {registration.activityLocation || "Chưa cập nhật địa điểm"}
                    </p>
                    <div className="rounded-lg bg-surface-container-low p-4">
                      <p className="flex items-center gap-2 font-semibold text-on-surface">
                        <ClipboardCheck className="h-4 w-4 text-primary" />
                        Chi tiết điểm danh
                      </p>
                      <div className="mt-3 grid gap-2 text-xs md:grid-cols-3">
                        <p>Xác thực đầu vào: {registration.faceVerified ? `Có - ${formatDateTime(registration.faceVerifiedTime)}` : "Chưa có"}</p>
                        {attendanceSessionCount === 3 && <p>QR giữa giờ: {registration.middleAttended ? `Có - ${formatDateTime(registration.middleCheckinTime)}` : "Chưa có"}</p>}
                        <p>QR cuối giờ: {registration.finalAttended ? `Có - ${formatDateTime(registration.finalCheckinTime)}` : "Chưa có"}</p>
                      </div>
                      {registration.faceVerificationNote && <p className="mt-2 text-xs text-on-surface-variant">Ghi chú xác thực: {registration.faceVerificationNote}</p>}
                    </div>
                  </div>

                  {registration.activityId && (
                    <Link className="mt-5 inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-3 font-semibold text-primary hover:bg-surface-container-low" to={`/student/activities/${registration.activityId}`}>
                      Xem hoạt động
                      <Search className="h-4 w-4" />
                    </Link>
                  )}
                </Card>
              );
            })}
          </div>
          <PaginationControls
            itemLabel="hoạt động"
            onPageChange={setPageIndex}
            onPageSizeChange={setPageSize}
            pageIndex={pageIndex}
            pageSize={pageSize}
            totalItems={totalItems}
          />
        </>
      )}
    </div>
  );
}

export default StudentActivityHistoryPage;
