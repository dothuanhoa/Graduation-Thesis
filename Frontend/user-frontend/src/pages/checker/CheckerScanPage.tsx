import { Camera, CheckCircle2, ListChecks, MapPin, RefreshCw, ShieldCheck, Upload, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import BackButton from "../../components/BackButton";
import { useAuth } from "../../context/useAuth";
import { activityApi, type ActivityRegistrationResponse, type ActivityResponse } from "../../services/api";
import { activityParticipationLabels, formatActivityRange, isActivityScanActive } from "../../utils/activityUi";
import { getDashboardPath } from "../../utils/authRouting";

const getCameraErrorMessage = (error: unknown) => {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "Trình duyệt đang chặn quyền camera. Vui lòng cho phép quyền camera rồi thử lại.";
    }
    if (error.name === "NotFoundError" || error.name === "OverconstrainedError") {
      return "Không tìm thấy camera phù hợp trên thiết bị. Vui lòng kiểm tra camera hoặc tải ảnh lên.";
    }
    if (error.name === "NotReadableError" || error.name === "AbortError") {
      return "Camera đang được ứng dụng khác sử dụng hoặc chưa sẵn sàng. Vui lòng đóng ứng dụng đang dùng camera rồi thử lại.";
    }
  }
  return error instanceof Error && error.message
    ? error.message
    : "Không mở được camera. Vui lòng kiểm tra quyền camera của trình duyệt.";
};

function CheckerScanPage() {
  const navigate = useNavigate();
  const { role, username } = useAuth();
  const [activities, setActivities] = useState<ActivityResponse[]>([]);
  const [activityId, setActivityId] = useState("");
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [result, setResult] = useState<ActivityRegistrationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [message, setMessage] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const selectedActivity = useMemo(
    () => activities.find((activity) => activity.id === activityId) ?? null,
    [activities, activityId],
  );
  const hasCheckerAccess = activities.length > 0;

  const loadActivities = useCallback(async (preserveFeedback = false) => {
    setLoading(true);
    if (!preserveFeedback) {
      setMessage("");
      setResult(null);
    }

    try {
      const data = await activityApi.listMyCheckerActivities({ suppressToast: true });
      const activeActivities = data
        .filter((activity) => isActivityScanActive(activity));
      setActivities(activeActivities);
      setActivityId((current) => (current && activeActivities.some((activity) => activity.id === current) ? current : activeActivities[0]?.id || ""));

      if (activeActivities.length === 0 && !preserveFeedback) {
        setMessage("Bạn chưa được phân quyền xác thực khuôn mặt cho hoạt động đang diễn ra.");
      }
    } catch (err) {
      setActivities([]);
      setActivityId("");
      setMessage(err instanceof Error ? err.message : "Không tải được danh sách hoạt động được phân quyền.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadActivities();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadActivities]);

  useEffect(() => {
    if (!faceFile) {
      setPreviewUrl("");
      return;
    }
    const nextUrl = URL.createObjectURL(faceFile);
    setPreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [faceFile]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraLoading(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = useCallback(async () => {
    if (!hasCheckerAccess) {
      setMessage("Bạn chưa được phân quyền xác thực khuôn mặt cho hoạt động đang diễn ra.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("Trình duyệt không hỗ trợ mở camera trực tiếp. Vui lòng dùng HTTPS/localhost hoặc tải ảnh lên.");
      return;
    }

    stopCamera();
    setCameraLoading(true);
    setMessage("");
    setResult(null);
    setFaceFile(null);
    setPreviewUrl("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch (err) {
      setCameraActive(false);
      setMessage(getCameraErrorMessage(err));
    } finally {
      setCameraLoading(false);
    }
  }, [hasCheckerAccess, stopCamera]);

  const submitFaceCheckin = useCallback(
    async (nextFaceFile: File) => {
      if (checking) return;

      if (!activityId || !activities.some((activity) => activity.id === activityId)) {
        setMessage("Bạn chưa được phân quyền xác thực khuôn mặt cho hoạt động này.");
        return;
      }

      setChecking(true);
      setMessage("");
      setResult(null);

      try {
        const checked = await activityApi.faceCheckin(activityId, nextFaceFile);
        await loadActivities(true);
        setResult(checked);
        setMessage(`Xác thực thành công: ${checked.studentCode} - ${checked.fullName}.`);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Không xác thực được khuôn mặt sinh viên.");
      } finally {
        setChecking(false);
      }
    },
    [activities, activityId, checking, loadActivities],
  );

  const captureFromCamera = useCallback(() => {
    const video = videoRef.current;
    if (!video || !cameraActive || video.videoWidth === 0 || video.videoHeight === 0) {
      setMessage("Camera chưa sẵn sàng. Vui lòng mở camera và thử chụp lại.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setMessage("Không tạo được ảnh từ camera. Vui lòng thử lại hoặc tải ảnh lên.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setMessage("Không chụp được ảnh từ camera. Vui lòng thử lại hoặc tải ảnh lên.");
        return;
      }
      const nextFaceFile = new File([blob], `face-checkin-${Date.now()}.jpg`, { type: "image/jpeg" });
      setFaceFile(nextFaceFile);
      setResult(null);
      stopCamera();
      void submitFaceCheckin(nextFaceFile);
    }, "image/jpeg", 0.92);
  }, [cameraActive, stopCamera, submitFaceCheckin]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    stopCamera();
    setFaceFile(file);
    setResult(null);
    event.target.value = "";
    if (file) {
      void submitFaceCheckin(file);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(getDashboardPath(role), { replace: true });
  };

  const checkedIn = selectedActivity?.attendedCount ?? 0;
  const registered = selectedActivity?.registrationCount ?? 0;
  const selectedOpenActivity = (selectedActivity?.participationType || "LIMITED") === "OPEN";
  const percent = registered > 0 ? Math.min(100, Math.round((checkedIn / registered) * 100)) : 0;

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-white">
      <div className="mx-auto mb-4 max-w-6xl">
        <BackButton className="border-white/15 bg-white/10 px-4 py-3 text-white hover:bg-white/15" onClick={handleBack}>
          Quay lại
        </BackButton>
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-112px)] max-w-6xl gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex min-h-[640px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-raised">
          <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <button className="rounded-xl bg-white/10 p-3 transition hover:bg-white/15" onClick={() => void loadActivities()} type="button">
              <RefreshCw className="h-5 w-5" />
            </button>
            <div className="text-center">
              <h1 className="font-bold">Xác thực khuôn mặt đầu vào</h1>
              <p className="text-xs text-white/60">{username || "Chưa xác định người xác thực"}</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </header>

          <div className="relative flex min-h-[420px] flex-1 items-center justify-center overflow-hidden bg-black">
            {previewUrl ? (
              <img alt="Ảnh khuôn mặt cần xác thực" className="h-full min-h-[420px] w-full object-contain" src={previewUrl} />
            ) : null}
            <video
              ref={videoRef}
              autoPlay
              className={`h-full min-h-[420px] w-full object-cover ${!previewUrl && cameraActive ? "block" : "hidden"}`}
              muted
              playsInline
            />
            {!previewUrl && !cameraActive ? (
              <div className="flex flex-col items-center justify-center px-6 text-center">
                <div className="rounded-2xl bg-white/10 p-5">
                  <Camera className="h-12 w-12" />
                </div>
                <h2 className="mt-4 text-2xl font-bold">{hasCheckerAccess ? "Chụp khuôn mặt sinh viên" : "Chưa có quyền xác thực"}</h2>
                <p className="mt-2 max-w-sm text-sm text-white/65">
                  {hasCheckerAccess
                    ? "Chụp hoặc tải ảnh khuôn mặt tại cổng vào để hệ thống tự nhận diện sinh viên và ghi nhận điểm danh."
                    : "Tài khoản của bạn chưa được phân công làm người điểm danh cho hoạt động đang diễn ra."}
                </p>
              </div>
            ) : null}
            {cameraLoading && <div className="absolute bottom-5 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-950">Đang mở camera...</div>}
            {checking && <div className="absolute bottom-5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-on-primary">Đang xác thực...</div>}
          </div>

          <div className="grid gap-3 border-t border-white/10 p-5 md:grid-cols-3">
            {!cameraActive ? (
              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 font-bold text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!hasCheckerAccess || cameraLoading || checking}
                onClick={() => void startCamera()}
                type="button"
              >
                <Camera className="h-5 w-5" />
                {cameraLoading ? "Đang mở camera..." : "Mở camera"}
              </button>
            ) : (
              <>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 font-bold text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!hasCheckerAccess || cameraLoading || checking}
                  onClick={captureFromCamera}
                  type="button"
                >
                  <Camera className="h-5 w-5" />
                  Chụp và xác thực
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={stopCamera}
                  type="button"
                >
                  <XCircle className="h-5 w-5" />
                  Tắt camera
                </button>
              </>
            )}
            <label className={`inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-4 font-bold text-white ${!hasCheckerAccess || checking ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
              <Upload className="h-5 w-5" />
              Tải ảnh lên
              <input accept="image/*" className="sr-only" disabled={!hasCheckerAccess || checking} onChange={handleFileChange} type="file" />
            </label>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl bg-white p-5 text-on-surface shadow-panel">
            {loading ? (
              <p className="text-sm text-on-surface-variant">Đang tải hoạt động...</p>
            ) : !hasCheckerAccess ? (
              <div className="space-y-4">
                <p className="text-sm text-on-surface-variant">Bạn chưa được phân quyền xác thực khuôn mặt cho hoạt động đang diễn ra.</p>
                <Link className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" to="/student/activities">
                  Xem hoạt động
                  <ListChecks className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-bold uppercase text-primary">Hoạt động được phân quyền</span>
                  <select className="rounded-lg border border-outline-variant px-3 py-3 text-sm focus-ring" onChange={(event) => setActivityId(event.target.value)} value={activityId}>
                    {activities.map((activity) => (
                      <option key={activity.id} value={activity.id}>
                        {activity.title}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedActivity && (
                  <div className="mt-5">
                    <h2 className="text-xl font-bold">{selectedActivity.title}</h2>
                    <p className="mt-2 flex items-center gap-2 text-sm text-on-surface-variant">
                      <MapPin className="h-4 w-4" />
                      {selectedActivity.location || "Chưa cập nhật địa điểm"}
                    </p>
                    <p className="mt-1 text-sm text-on-surface-variant">{formatActivityRange(selectedActivity.startTime, selectedActivity.endTime)}</p>
                    <p className="mt-1 text-sm font-semibold text-primary">{activityParticipationLabels[selectedActivity.participationType || "LIMITED"]}</p>
                    {selectedOpenActivity && (
                      <p className="mt-3 rounded-lg bg-surface-container-low p-3 text-xs font-semibold text-on-surface-variant">
                        Hoạt động tự do: không kiểm tra danh sách đăng ký, mỗi sinh viên được ghi nhận bằng một lần xác thực khuôn mặt.
                      </p>
                    )}

                    <div className="mt-5 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-on-surface-variant">{selectedOpenActivity ? "Đã điểm danh" : "Đã tham gia đủ"}</p>
                        <p className="text-4xl font-bold text-primary">{checkedIn}</p>
                      </div>
                      <p className="pb-2 text-sm font-semibold text-on-surface-variant">/ {registered} {selectedOpenActivity ? "sinh viên đã ghi nhận" : "sinh viên đăng ký"}</p>
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-primary-fixed">
                      <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          <section className="rounded-2xl bg-white p-5 text-on-surface shadow-panel">
            {message && (
              <div className={`mb-4 rounded-xl p-4 ${result ? "bg-emerald-50 text-emerald-800" : "bg-error-container text-error"}`}>
                <div className="flex gap-3">
                  {result ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                  <div>
                    <p className="text-sm font-bold">{message}</p>
                    {result && (
                      <>
                        <h3 className="mt-1 text-xl font-bold">{result.fullName}</h3>
                        <p className="text-sm">MSSV: {result.studentCode}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
              <p className="text-sm font-bold text-on-surface">Kết quả xác thực tự động</p>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                Chọn hoạt động, mở camera rồi bấm “Chụp và xác thực”. Hệ thống sẽ tự nhận diện sinh viên từ ảnh khuôn mặt, kiểm tra danh sách đăng ký nếu là hoạt động giới hạn, sau đó trả kết quả ngay.
              </p>
              {faceFile && <p className="mt-3 text-sm font-semibold text-on-surface-variant">Ảnh đã chọn: {faceFile.name}</p>}
              {checking && <p className="mt-3 text-sm font-semibold text-primary">Đang nhận diện khuôn mặt...</p>}
            </div>

            <button className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 py-4 font-bold text-on-surface" onClick={() => void loadActivities()} type="button">
              <ListChecks className="h-5 w-5" />
              Cập nhật số liệu
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default CheckerScanPage;
