import { AlertTriangle, ArrowLeft, Clock, Flag, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Card from "../../../components/Card";
import { examApi, type ExamStateResponse } from "../../../services/api";

const formatTime = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60).toString().padStart(2, "0");
  const secs = Math.floor(safe % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

function ExamTakePage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<ExamStateResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const submittingRef = useRef(false);
  const violationPendingRef = useRef(false);

  const loadExam = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setMessage("");
    try {
      const data = await examApi.start(id);
      setState(data);
      setRemainingSeconds(data.remainingSeconds);
      if (["SUBMITTED", "LOCKED"].includes(data.status)) {
        navigate(`/student/exams/${id}/result`);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không vào được bài thi.");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    void loadExam();
  }, [loadExam]);

  useEffect(() => {
    if (!state || state.status !== "IN_PROGRESS") return;
    const timerId = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timerId);
          if (!submittingRef.current) {
            submittingRef.current = true;
            examApi.submit(id).finally(() => navigate(`/student/exams/${id}/result`));
          }
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [id, navigate, state]);

  useEffect(() => {
    if (!state || state.status !== "IN_PROGRESS") return;
    const onBlur = async () => {
      if (violationPendingRef.current || submittingRef.current) return;
      violationPendingRef.current = true;
      try {
        const next = await examApi.recordViolation(id);
        setState(next);
        setRemainingSeconds(next.remainingSeconds);
        if (["SUBMITTED", "LOCKED"].includes(next.status)) {
          navigate(`/student/exams/${id}/result`);
        }
      } catch {
        // Không chặn UI nếu request ghi vi phạm lỗi tạm thời.
      } finally {
        window.setTimeout(() => {
          violationPendingRef.current = false;
        }, 800);
      }
    };
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, [id, navigate, state]);

  const currentQuestion = state?.questions[currentIndex];
  const answeredCount = useMemo(() => Object.keys(state?.answers || {}).length, [state]);

  const saveAnswer = async (questionId: string, optionId: string) => {
    if (!id || !state) return;
    setState({ ...state, answers: { ...state.answers, [questionId]: optionId } });
    try {
      const next = await examApi.saveAnswer(id, questionId, optionId);
      setState(next);
      setRemainingSeconds(next.remainingSeconds);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không lưu được đáp án.");
    }
  };

  const submit = async () => {
    if (!id || submittingRef.current) return;
    if (!window.confirm("Bạn chắc chắn muốn nộp bài? Sau khi nộp sẽ không thể sửa đáp án.")) return;
    submittingRef.current = true;
    try {
      await examApi.submit(id);
      navigate(`/student/exams/${id}/result`);
    } catch (err) {
      submittingRef.current = false;
      setMessage(err instanceof Error ? err.message : "Không nộp được bài.");
    }
  };

  if (loading) {
    return <div className="panel p-6 text-on-surface-variant">Đang khởi tạo bài thi...</div>;
  }

  if (!state || !currentQuestion) {
    return (
      <div className="space-y-gutter">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline" to="/student/exams">
          <ArrowLeft className="h-4 w-4" />
          Quay lại kỳ thi
        </Link>
        <div className="panel p-6 text-on-surface-variant">{message || "Không có dữ liệu bài thi."}</div>
      </div>
    );
  }

  return (
    <div className="space-y-gutter">
      <div className="sticky top-16 z-20 panel flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline" to="/student/exams">
            <ArrowLeft className="h-4 w-4" />
            Danh sách kỳ thi
          </Link>
          <p className="text-sm font-semibold text-primary">Bài kiểm tra trắc nghiệm</p>
          <h1 className="text-2xl font-bold text-on-surface">Màn hình làm bài thi</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-lg bg-error-container px-3 py-2 font-semibold text-error">
            <Clock className="h-5 w-5" />
            {formatTime(remainingSeconds)}
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 font-semibold text-amber-800">
            <AlertTriangle className="h-5 w-5" />
            {state.violationCount} vi phạm
          </span>
        </div>
      </div>

      {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">{message}</div>}

      <section className="grid gap-gutter lg:grid-cols-[1fr_300px]">
        <Card>
          <p className="text-sm font-semibold text-primary">Câu {currentIndex + 1} / {state.questions.length}</p>
          <h2 className="mt-3 text-xl font-bold leading-8 text-on-surface">{currentQuestion.content}</h2>
          <div className="mt-6 space-y-3">
            {currentQuestion.options.map((answer, index) => (
              <label key={answer.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-outline-variant p-4 hover:bg-surface-container-low">
                <input
                  checked={state.answers[currentQuestion.id] === answer.id}
                  className="h-4 w-4 text-primary focus-ring"
                  name={`answer-${currentQuestion.id}`}
                  onChange={() => void saveAnswer(currentQuestion.id, answer.id)}
                  type="radio"
                />
                <span className="font-semibold text-on-surface">{String.fromCharCode(65 + index)}.</span>
                <span className="text-on-surface-variant">{answer.content}</span>
              </label>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap justify-between gap-3">
            <button className="rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary disabled:opacity-50" disabled={currentIndex === 0} onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))} type="button">
              Câu trước
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary disabled:opacity-50" disabled={currentIndex >= state.questions.length - 1} onClick={() => setCurrentIndex((index) => Math.min(state.questions.length - 1, index + 1))} type="button">
              <Save className="h-5 w-5" />
              Lưu và tiếp tục
            </button>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-on-surface">Danh sách câu hỏi</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Đã làm {answeredCount}/{state.questions.length}</p>
          <div className="mt-5 grid grid-cols-5 gap-2">
            {state.questions.map((question, index) => (
              <button
                key={question.id}
                className={`h-10 rounded-lg border font-semibold ${
                  index === currentIndex
                    ? "bg-primary text-on-primary"
                    : state.answers[question.id]
                      ? "bg-emerald-100 text-emerald-700"
                      : "border-outline-variant text-on-surface-variant"
                }`}
                onClick={() => setCurrentIndex(index)}
                type="button"
              >
                {index + 1}
              </button>
            ))}
          </div>
          <button className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-error px-4 py-3 font-semibold text-on-primary" onClick={() => void submit()} type="button">
            <Flag className="h-5 w-5" />
            Nộp bài
          </button>
        </Card>
      </section>
    </div>
  );
}

export default ExamTakePage;
