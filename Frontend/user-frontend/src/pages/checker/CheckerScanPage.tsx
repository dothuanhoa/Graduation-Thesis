import { BrowserCodeReader, BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { Camera, CheckCircle2, Keyboard, ListChecks, MapPin, RefreshCw, ScanLine, StopCircle, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import BackButton from "../../components/BackButton";
import { useAuth } from "../../context/useAuth";
import { activityApi, type ActivityRegistrationResponse, type ActivityResponse } from "../../services/api";
import { activityParticipationLabels, formatActivityRange, isActivityScanActive } from "../../utils/activityUi";
import { getDashboardPath } from "../../utils/authRouting";
import { checkinSchema } from "../../validation/activitySchemas";
import { getZodMessage } from "../../validation/userSchemas";

const codePattern = /(?:[A-Za-z]{2}\d{6,}|\d{6,12})/;

const extractStudentCode = (rawValue: string) => {
  const value = rawValue.trim();

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const fromJson = parsed.studentCode || parsed.studentId || parsed.mssv || parsed.code || parsed.username;
    if (typeof fromJson === "string" && fromJson.trim()) return fromJson.trim();
  } catch {
    // QR có thể là URL hoặc MSSV thuần, không nhất thiết là JSON.
  }

  try {
    const url = new URL(value);
    const fromQuery = url.searchParams.get("studentCode") || url.searchParams.get("studentId") || url.searchParams.get("mssv") || url.searchParams.get("code");
    if (fromQuery?.trim()) return fromQuery.trim();
  } catch {
    // QR nội bộ có thể chỉ chứa MSSV thuần, không phải URL.
  }

  const labeledMatch = value.match(/(?:MSSV|studentCode|studentId|code)\s*[:=-]\s*([A-Za-z]{2}\d{6,}|\d{6,12})/i);
  if (labeledMatch?.[1]) return labeledMatch[1].trim();

  const codeMatch = value.match(codePattern);
  return (codeMatch?.[0] || value).trim();
};

function CheckerScanPage() {
  const navigate = useNavigate();
  const { role, username } = useAuth();
  const [activities, setActivities] = useState<ActivityResponse[]>([]);
  const [activityId, setActivityId] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [result, setResult] = useState<ActivityRegistrationResponse | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastScannedRef = useRef("");

  const selectedActivity = useMemo(
    () => activities.find((activity) => activity.id === activityId) ?? null,
    [activities, activityId],
  );
  const hasCheckerAccess = activities.length > 0;

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    BrowserCodeReader.releaseAllStreams();
    setScanning(false);
  }, []);

  const loadActivities = useCallback(async (preserveFeedback = false) => {
    setLoading(true);
    if (!preserveFeedback) {
      setMessage("");
      setResult(null);
    }

    try {
      const data = await activityApi.listMyCheckerActivities({ suppressToast: true });
      const activeActivities = data.filter((activity) => isActivityScanActive(activity));
      setActivities(activeActivities);
      setActivityId((current) => (current && activeActivities.some((activity) => activity.id === current) ? current : activeActivities[0]?.id || ""));

      if (activeActivities.length === 0) {
        stopScanner();
        if (!preserveFeedback) {
          setMessage("Bạn chưa được phân quyền quét điểm danh cho hoạt động đang diễn ra.");
        }
      }
    } catch (err) {
      stopScanner();
      setActivities([]);
      setActivityId("");
      setMessage(err instanceof Error ? err.message : "Không tải được danh sách hoạt động được phân quyền.");
    } finally {
      setLoading(false);
    }
  }, [stopScanner]);

  const submitCheckin = useCallback(
    async (code: string) => {
      if (checking) return;

      if (!activityId || !activities.some((activity) => activity.id === activityId)) {
        setMessage("Bạn chưa được phân quyền quét điểm danh cho hoạt động này.");
        return;
      }

      setChecking(true);
      setMessage("");
      setResult(null);

      try {
        const validated = checkinSchema.parse({ activityId, studentCode: code });
        const checked = await activityApi.checkin(validated.activityId, validated.studentCode.trim(), username);
        await loadActivities(true);
        setResult(checked);
        setStudentCode("");
        setMessage("Điểm danh thành công.");
      } catch (err) {
        setMessage(getZodMessage(err, err instanceof Error ? err.message : "Không điểm danh được sinh viên."));
      } finally {
        setChecking(false);
      }
    },
    [activities, activityId, checking, loadActivities, username],
  );

  const startScanner = useCallback(async () => {
    if (!videoRef.current) {
      setMessage("Không tìm thấy khung camera để quét.");
      return;
    }

    if (!activityId || !hasCheckerAccess) {
      setMessage("Bạn chưa được phân quyền quét điểm danh cho hoạt động đang diễn ra.");
      return;
    }

    stopScanner();
    setMessage("");

    try {
      const availableDevices = await BrowserCodeReader.listVideoInputDevices();
      setDevices(availableDevices);
      const nextDeviceId = selectedDeviceId || availableDevices[0]?.deviceId || "";
      if (nextDeviceId && !selectedDeviceId) setSelectedDeviceId(nextDeviceId);

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE, BarcodeFormat.CODE_128, BarcodeFormat.CODE_39]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      const reader = new BrowserMultiFormatReader(hints, {
        delayBetweenScanAttempts: 250,
        delayBetweenScanSuccess: 900,
      });

      const controls = await reader.decodeFromVideoDevice(nextDeviceId || undefined, videoRef.current, (scanResult) => {
        if (!scanResult) return;

        const code = extractStudentCode(scanResult.getText());
        const scanKey = `${activityId}-${code}`;

        if (!code || lastScannedRef.current === scanKey) return;
        lastScannedRef.current = scanKey;
        window.setTimeout(() => {
          if (lastScannedRef.current === scanKey) lastScannedRef.current = "";
        }, 1800);
        void submitCheckin(code);
      });

      controlsRef.current = controls;
      setScanning(true);
    } catch (err) {
      setScanning(false);
      setMessage(err instanceof Error ? err.message : "Không mở được camera. Vui lòng kiểm tra quyền truy cập camera.");
    }
  }, [activityId, hasCheckerAccess, selectedDeviceId, stopScanner, submitCheckin]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadActivities();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadActivities]);

  useEffect(() => stopScanner, [stopScanner]);

  const handleManualCheckin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitCheckin(studentCode);
  };

  const handleBack = () => {
    stopScanner();
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(getDashboardPath(role), { replace: true });
  };

  const checkedIn = selectedActivity?.attendedCount ?? 0;
  const registered = selectedActivity?.registrationCount ?? 0;
  const isOpenActivity = selectedActivity?.participationType === "OPEN";
  const percent = !isOpenActivity && registered > 0 ? Math.min(100, Math.round((checkedIn / registered) * 100)) : 0;

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
              <h1 className="font-bold">Điểm danh hoạt động</h1>
              <p className="text-xs text-white/60">{username || "Chưa xác định người quét"}</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3">
              <ScanLine className="h-5 w-5" />
            </div>
          </header>

          <div className="relative flex min-h-[420px] flex-1 items-center justify-center overflow-hidden bg-black">
            <video ref={videoRef} className="h-full min-h-[420px] w-full object-cover" muted playsInline />
            {(!scanning || !hasCheckerAccess) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 px-6 text-center">
                <div className="rounded-2xl bg-white/10 p-5">
                  <Camera className="h-12 w-12" />
                </div>
                <h2 className="mt-4 text-2xl font-bold">{hasCheckerAccess ? "Sẵn sàng quét mã" : "Chưa có quyền quét"}</h2>
                <p className="mt-2 max-w-sm text-sm text-white/65">
                  {hasCheckerAccess
                    ? "Chọn hoạt động, cho phép camera, rồi đưa mã QR hoặc barcode của sinh viên vào khung quét."
                    : "Tài khoản của bạn chưa được phân công làm người điểm danh cho hoạt động đang diễn ra."}
                </p>
              </div>
            )}
            {hasCheckerAccess && (
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-3xl border-4 border-white/80 shadow-[0_0_0_999px_rgba(2,6,23,0.35)]" />
            )}
            {checking && <div className="absolute bottom-5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-on-primary">Đang gửi điểm danh...</div>}
          </div>

          <div className="grid gap-3 border-t border-white/10 p-5 md:grid-cols-2">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 font-bold text-on-primary disabled:opacity-60"
              disabled={loading || !activityId || scanning || !hasCheckerAccess}
              onClick={startScanner}
              type="button"
            >
              <Camera className="h-5 w-5" />
              Bật camera
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-4 font-bold text-white disabled:opacity-60"
              disabled={!scanning}
              onClick={stopScanner}
              type="button"
            >
              <StopCircle className="h-5 w-5" />
              Tắt camera
            </button>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl bg-white p-5 text-on-surface shadow-panel">
            {loading ? (
              <p className="text-sm text-on-surface-variant">Đang tải hoạt động...</p>
            ) : !hasCheckerAccess ? (
              <div className="space-y-4">
                <p className="text-sm text-on-surface-variant">Bạn chưa được phân quyền quét điểm danh cho hoạt động đang diễn ra.</p>
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

                {devices.length > 1 && (
                  <label className="mt-4 flex flex-col gap-2">
                    <span className="text-xs font-bold uppercase text-primary">Camera</span>
                    <select
                      className="rounded-lg border border-outline-variant px-3 py-3 text-sm focus-ring"
                      disabled={scanning}
                      onChange={(event) => setSelectedDeviceId(event.target.value)}
                      value={selectedDeviceId}
                    >
                      {devices.map((device, index) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Camera ${index + 1}`}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {selectedActivity && (
                  <div className="mt-5">
                    <h2 className="text-xl font-bold">{selectedActivity.title}</h2>
                    <p className="mt-2 flex items-center gap-2 text-sm text-on-surface-variant">
                      <MapPin className="h-4 w-4" />
                      {selectedActivity.location || "Chưa cập nhật địa điểm"}
                    </p>
                    <p className="mt-1 text-sm text-on-surface-variant">{formatActivityRange(selectedActivity.startTime, selectedActivity.endTime)}</p>
                    <p className="mt-1 text-sm font-semibold text-primary">{activityParticipationLabels[selectedActivity.participationType || "LIMITED"]}</p>

                    <div className="mt-5 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-on-surface-variant">Đã điểm danh</p>
                        <p className="text-4xl font-bold text-primary">{checkedIn}</p>
                      </div>
                      {!isOpenActivity && <p className="pb-2 text-sm font-semibold text-on-surface-variant">/ {registered} sinh viên</p>}
                    </div>
                    {!isOpenActivity && (
                      <div className="mt-4 h-2 rounded-full bg-primary-fixed">
                        <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
                      </div>
                    )}
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

            <form onSubmit={handleManualCheckin}>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold">Nhập MSSV thủ công</span>
                <input
                  className="rounded-xl border border-outline-variant px-4 py-4 text-lg font-bold uppercase tracking-wide focus-ring disabled:bg-surface-container-low disabled:text-on-surface-variant"
                  disabled={!hasCheckerAccess}
                  onChange={(event) => setStudentCode(event.target.value)}
                  placeholder="Ví dụ: DH52201258"
                  value={studentCode}
                />
              </label>
              <button
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 font-bold text-on-primary disabled:opacity-60"
                disabled={checking || !activityId || !hasCheckerAccess}
                type="submit"
              >
                <Keyboard className="h-5 w-5" />
                {checking ? "Đang điểm danh..." : "Xác nhận điểm danh"}
              </button>
            </form>

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
