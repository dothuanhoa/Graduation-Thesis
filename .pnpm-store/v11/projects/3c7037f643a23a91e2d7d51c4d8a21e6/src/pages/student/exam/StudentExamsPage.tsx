import { Clock, FileText, PlayCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../../../components/Card";
import FilterBar from "../../../components/FilterBar";
import PageHeader from "../../../components/PageHeader";
import PaginationControls from "../../../components/PaginationControls";
import { usePaginatedList } from "../../../hooks/usePaginatedList";
import { examApi, type StudentExamSummary } from "../../../services/api";
import { formatVietnamDateTime } from "../../../utils/dateTime";
import { includesSearch } from "../../../utils/search";
import { studentGroupName } from "../../../utils/studentGroups";

const availabilityLabel: Record<string, string> = {
  UPCOMING: "Sắp mở",
  AVAILABLE: "Có thể làm",
  IN_PROGRESS: "Đang làm",
  COMPLETED: "Đã hoàn thành",
  CLOSED: "Đã đóng",
  LOCKED: "Bị khóa",
};

const availabilityTone: Record<string, string> = {
  UPCOMING: "bg-blue-100 text-blue-700",
  AVAILABLE: "bg-emerald-100 text-emerald-700",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-slate-200 text-slate-700",
  CLOSED: "bg-slate-200 text-slate-700",
  LOCKED: "bg-red-100 text-red-700",
};

const formatDateTime = (value?: string) => formatVietnamDateTime(value);

function StudentExamsPage() {
  const [exams, setExams] = useState<StudentExamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [keyword, setKeyword] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("");

  const loadExams = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      setExams(await examApi.listMine());
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không tải được danh sách kỳ thi.");
      setExams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadExams(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadExams]);

  const filteredExams = useMemo(
    () =>
      exams.filter((exam) => {
        const groupName = exam.targetGroupName || studentGroupName(exam.targetGroupCode);
        const matchesKeyword = includesSearch(`${exam.title} ${exam.description ?? ""} ${groupName}`, keyword);
        const matchesAvailability = !availabilityFilter || exam.availabilityStatus === availabilityFilter;
        return matchesKeyword && matchesAvailability;
      }),
    [availabilityFilter, exams, keyword],
  );

  const {
    pageItems: paginatedExams,
    pageIndex,
    pageSize,
    totalItems,
    setPageIndex,
    setPageSize,
  } = usePaginatedList(filteredExams);

  return (
    <div className="space-y-gutter">
      <PageHeader
        title="Kỳ thi của tôi"
        subtitle="Theo dõi các bài kiểm tra quy chế, thời gian mở đề, lượt làm bài và kết quả đã ghi nhận."
      />

      <div className="flex flex-wrap gap-3">
        <button className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" onClick={loadExams} type="button">
          <RefreshCw className="h-5 w-5" />
          Tải lại
        </button>
      </div>

      {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">{message}</div>}

      <FilterBar
        filters={[
          {
            id: "availability",
            label: "Trạng thái",
            value: availabilityFilter,
            onChange: setAvailabilityFilter,
            options: [
              { value: "", label: "Tất cả trạng thái" },
              ...Object.entries(availabilityLabel).map(([value, label]) => ({ value, label })),
            ],
          },
        ]}
        onReset={() => {
          setKeyword("");
          setAvailabilityFilter("");
        }}
        onSearchChange={setKeyword}
        resultText={`Hiển thị ${filteredExams.length} / ${exams.length} kỳ thi`}
        searchPlaceholder="Nhập tên kỳ thi, mô tả hoặc đối tượng"
        searchValue={keyword}
        title="Lọc kỳ thi"
      />

      {loading ? (
        <div className="panel p-6 text-on-surface-variant">Đang tải danh sách kỳ thi...</div>
      ) : (
        <div className="grid gap-gutter lg:grid-cols-3">
          {paginatedExams.map((exam) => (
            <Card key={exam.id} className="flex flex-col">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="rounded-lg bg-primary-fixed p-3 text-primary">
                  <FileText className="h-6 w-6" />
                </div>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${availabilityTone[exam.availabilityStatus]}`}>
                  {availabilityLabel[exam.availabilityStatus]}
                </span>
              </div>
              <h2 className="text-xl font-bold text-on-surface">{exam.title}</h2>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-on-surface-variant">{exam.description || "Bài kiểm tra trắc nghiệm theo kế hoạch của Phòng CTSV."}</p>
              <div className="mt-5 space-y-3 text-sm text-on-surface-variant">
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {exam.durationMins} phút · {exam.questionCount} câu
                </p>
                <p>Đối tượng: {exam.targetGroupName || studentGroupName(exam.targetGroupCode)}</p>
                <p>Mở: {formatDateTime(exam.startTime)}</p>
                <p>Đóng: {formatDateTime(exam.endTime)}</p>
                {exam.score !== undefined && <p className="font-semibold text-primary">Kết quả: {exam.score}/10</p>}
                {exam.violationCount > 0 && <p>Vi phạm ghi nhận: {exam.violationCount}</p>}
              </div>
              <div className="mt-auto pt-6">
                {["AVAILABLE", "IN_PROGRESS"].includes(exam.availabilityStatus) ? (
                  <Link
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary"
                    to={`/student/exams/${exam.id}/take`}
                  >
                    <PlayCircle className="h-5 w-5" />
                    {exam.availabilityStatus === "IN_PROGRESS" ? "Tiếp tục làm bài" : "Vào làm bài"}
                  </Link>
                ) : exam.availabilityStatus === "COMPLETED" || exam.availabilityStatus === "LOCKED" ? (
                  <Link
                    className="inline-flex w-full items-center justify-center rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary"
                    to={`/student/exams/${exam.id}/result`}
                  >
                    Xem kết quả
                  </Link>
                ) : (
                  <button className="w-full rounded-lg border border-outline-variant px-4 py-3 font-semibold text-on-surface-variant" disabled type="button">
                    Chưa thể làm bài
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredExams.length === 0 && <div className="panel p-6 text-on-surface-variant">Không tìm thấy kỳ thi phù hợp.</div>}

      {filteredExams.length > 0 && (
        <PaginationControls
          itemLabel="kỳ thi"
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

export default StudentExamsPage;
