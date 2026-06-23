import { Clock, FileText, PlayCircle } from "lucide-react";
import { Link } from "react-router-dom";
import Card from "../../../components/Card";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import { studentExams } from "../../../data/studentPortalData";

function StudentExamsPage() {
  return (
    <div className="space-y-gutter">
      <PageHeader
        title="Kỳ thi của tôi"
        subtitle="Theo dõi các bài kiểm tra quy chế, số lượt làm bài và kết quả đã ghi nhận."
      />

      <div className="grid gap-gutter lg:grid-cols-3">
        {studentExams.map((exam) => (
          <Card key={exam.id} className="flex flex-col">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="rounded-lg bg-primary-fixed p-3 text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <StatusBadge status={exam.status} />
            </div>
            <h2 className="text-xl font-bold text-on-surface">{exam.title}</h2>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">{exam.requirement}</p>
            <div className="mt-5 space-y-3 text-sm text-on-surface-variant">
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {exam.duration}
              </p>
              <p>{exam.window}</p>
              <p>Lượt thi: {exam.attempt}</p>
              {exam.score && <p className="font-semibold text-primary">Kết quả: {exam.score}</p>}
            </div>
            <div className="mt-auto pt-6">
              {exam.status === "ACTIVE" ? (
                <Link
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary"
                  to={`/student/exams/${exam.id}/take`}
                >
                  <PlayCircle className="h-5 w-5" />
                  Vào làm bài
                </Link>
              ) : (
                <Link
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary"
                  to={exam.status === "COMPLETED" ? `/student/exams/${exam.id}/result` : `/student/exams/${exam.id}/instruction`}
                >
                  Xem chi tiết
                </Link>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default StudentExamsPage;
