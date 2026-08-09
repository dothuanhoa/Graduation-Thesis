import { BrowserCodeReader, BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { Camera, CheckCircle2, Loader2, RefreshCw, ScanLine, ShieldCheck, StopCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BackButton from "../../../components/BackButton";
import { activityApi, ApiError, type ActivityRegistrationResponse, type ActivityResponse } from "../../../services/api";
import { formatDateTime } from "../../../utils/activityUi";
import { getCurrentBrowserLocation, type BrowserLocation } from "../../../utils/geolocation";

const extractQrPayload = (rawValue: string) => {
  const value = rawValue.trim();
  if (!value) return "";

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const fromJson = parsed.qrCode || parsed.qrPayload || parsed.code;
    if (typeof fromJson === "string" && fromJson.trim()) return fromJson.trim();
  } catch {
    // QR co the la chuoi ACTIVITY_QR thuan.
  }

  try {
    const url = new URL(value);
    const fromQuery = url.searchParams.get("qrCode") || url.searchParams.get("code");
    if (fromQuery?.trim()) return fromQuery.trim();
  } catch {
    // Khong phai URL.
  }

  return value;
};

const tryGetQrCheckinLocation = async (): Promise<BrowserLocation | null> => {
  try {
    return await getCurrentBrowserLocation();
  } catch {
    return null;
  }
};

function StudentActivityQrCheckinPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<ActivityResponse | null>(null);
  const [result, setResult] = useState<ActivityRegistrationResponse | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [message, setMessage] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastScanRef = useRef("");

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    BrowserCodeReader.releaseAllStreams();
    lastScanRef.current = "";
    setScanning(false);
    setCameraStarting(false);
  }, []);

  useEffect(() => {
    const loadActivity = async () => {
      if (!id) {
        setActivity(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await activityApi.get(id);
        setActivity(data);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          navigate("/404", { replace: true });
          return;
        }
        setMessage(err instanceof Error ? err.message : "Không tải được hoạt động.");
      } finally {
        setLoading(false);
      }
    };

    void loadActivity();
    return () => stopScanner();
  }, [id, navigate, stopScanner]);

  const submitQr = useCallback(
    async (value: string) => {
      if (submitting) return;
      const payload = extractQrPayload(value);
      if (!payload) {
        setMessage("Vui lòng quét mã QR điểm danh hợp lệ.");
        return;
      }

      setSubmitting(true);
      setMessage("");
      setResult(null);
      try {
        setMessage("Đang lấy vị trí hiện tại để kiểm tra phạm vi điểm danh...");
        const location = await tryGetQrCheckinLocation();
        const checkinPayload = {
          qrCode: payload,
          ...(location ?? {}),
        };
        const checked = id ? await activityApi.qrCheckin(id, checkinPayload) : await activityApi.qrCheckinByPayload(checkinPayload);
        stopScanner();
        setResult(checked);
        setMessage("Đã ghi nhận điểm danh bằng QR.");
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Không ghi nhận được điểm danh bằng QR.");
      } finally {
        setSubmitting(false);
      }
    },
    [id, stopScanner, submitting],
  );

  const startScanner = useCallback(async () => {
    if (!videoRef.current) {
      setMessage("Khong tim thay khung camera.");
      return;
    }

    stopScanner();
    setCameraStarting(true);
    setMessage("");
    try {
      const availableDevices = await BrowserCodeReader.listVideoInputDevices();
      setDevices(availableDevices);
      const preferredRearCamera = availableDevices.find((device) => /back|rear|environment|sau/i.test(device.label));
      const nextDeviceId = selectedDeviceId
        || preferredRearCamera?.deviceId
        || availableDevices.at(-1)?.deviceId
        || "";
      if (nextDeviceId && !selectedDeviceId) setSelectedDeviceId(nextDeviceId);

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      const reader = new BrowserMultiFormatReader(hints, {
        delayBetweenScanAttempts: 250,
        delayBetweenScanSuccess: 900,
      });

      const handleScanResult = (scanResult: { getText: () => string } | undefined) => {
        if (!scanResult) return;
        const payload = extractQrPayload(scanResult.getText());
        if (!payload || payload === lastScanRef.current) return;
        lastScanRef.current = payload;
        window.setTimeout(() => {
          if (lastScanRef.current === payload) lastScanRef.current = "";
        }, 1800);
        void submitQr(payload);
      };

      const controls = nextDeviceId
        ? await reader.decodeFromVideoDevice(nextDeviceId, videoRef.current, handleScanResult)
        : await reader.decodeFromConstraints(
            { audio: false, video: { facingMode: { ideal: "environment" } } },
            videoRef.current,
            handleScanResult,
          );

      controlsRef.current = controls;
      setScanning(true);
    } catch (err) {
      setScanning(false);
      setMessage(err instanceof Error ? err.message : "Không mở được camera. Vui lòng kiểm tra quyền camera.");
    } finally {
      setCameraStarting(false);
    }
  }, [selectedDeviceId, stopScanner, submitQr]);

  if (loading) {
    return <div className="panel p-6 text-on-surface-variant">Đang tải trang quét QR...</div>;
  }

  return (
    <div className="-mx-4 -mt-2 space-y-4 overflow-x-hidden pb-6 md:mx-0 md:mt-0 md:space-y-gutter">
      <div className="px-4 md:px-0">
        <BackButton to={id ? `/student/activities/${id}` : "/student/activities"}>
          Quay lại
        </BackButton>
      </div>

      <header className="px-4 md:px-0">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">Điểm danh sinh viên</p>
        <h1 className="mt-1 text-2xl font-bold text-on-surface md:text-4xl">Quét QR điểm danh</h1>
        <p className="mt-2 break-words text-sm leading-6 text-on-surface-variant md:text-base">
          {activity ? activity.title : "Đưa mã QR vào khung camera để hệ thống tự động ghi nhận."}
        </p>
      </header>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] lg:gap-gutter">
        <section className="min-w-0 overflow-hidden bg-slate-950 text-white shadow-raised md:rounded-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3.5 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-xl bg-white/10 p-2.5">
                <ScanLine className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold">Camera quét mã</h2>
                <p className="truncate text-xs text-white/60">Ưu tiên camera sau của điện thoại</p>
              </div>
            </div>
            <span className="ml-2 inline-flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
              <span className={`h-2 w-2 rounded-full ${scanning ? "animate-pulse bg-emerald-400" : "bg-white/35"}`} />
              {cameraStarting ? "Đang mở" : scanning ? "Đang quét" : "Chưa bật"}
            </span>
          </div>

          <div className="relative aspect-[3/4] overflow-hidden bg-black sm:aspect-video lg:aspect-[4/3]">
            <video ref={videoRef} autoPlay className="h-full w-full object-cover" muted playsInline />

            {!scanning && !cameraStarting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 px-8 text-center">
                <div className="rounded-2xl bg-white/10 p-5">
                  <Camera className="h-11 w-11" />
                </div>
                <h3 className="mt-4 text-xl font-bold">Sẵn sàng quét QR</h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-white/60">Nhấn mở camera, sau đó hướng điện thoại về mã QR được hiển thị.</p>
              </div>
            )}

            {(scanning || cameraStarting) && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
                <div className="relative aspect-square w-full max-w-[300px] rounded-3xl bg-transparent">
                  <span className="absolute left-0 top-0 h-16 w-16 rounded-tl-3xl border-l-4 border-t-4 border-primary" />
                  <span className="absolute right-0 top-0 h-16 w-16 rounded-tr-3xl border-r-4 border-t-4 border-primary" />
                  <span className="absolute bottom-0 left-0 h-16 w-16 rounded-bl-3xl border-b-4 border-l-4 border-primary" />
                  <span className="absolute bottom-0 right-0 h-16 w-16 rounded-br-3xl border-b-4 border-r-4 border-primary" />
                  {scanning && <span className="absolute left-5 right-5 top-1/2 h-0.5 animate-pulse bg-primary shadow-[0_0_12px_rgba(255,255,255,0.8)]" />}
                </div>
              </div>
            )}

            {submitting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/75 backdrop-blur-sm">
                <Loader2 className="h-10 w-10 animate-spin" />
                <p className="mt-3 font-bold">Đang kiểm tra điểm danh...</p>
              </div>
            )}

            {scanning && !submitting && (
              <p className="absolute inset-x-4 bottom-4 rounded-full bg-black/65 px-4 py-2.5 text-center text-xs font-semibold backdrop-blur-sm">
                Giữ điện thoại ổn định và đặt toàn bộ mã QR trong khung
              </p>
            )}
          </div>

          <div className={`grid gap-3 border-t border-white/10 p-4 sm:p-5 ${scanning ? "grid-cols-2" : "grid-cols-1"}`}>
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting || cameraStarting}
              onClick={() => void startScanner()}
              type="button"
            >
              {cameraStarting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
              {cameraStarting ? "Đang mở..." : scanning ? "Quét lại" : "Mở camera"}
            </button>
            {scanning && (
              <button
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-3 font-bold text-white"
                onClick={stopScanner}
                type="button"
              >
                <StopCircle className="h-5 w-5" />
                Dừng
              </button>
            )}
          </div>

          {devices.length > 1 && (
            <label className="flex flex-col gap-1.5 border-t border-white/10 px-4 py-4 sm:px-5">
              <span className="text-xs font-bold uppercase text-white/60">Đổi camera</span>
              <select
                className="min-h-12 rounded-xl border border-white/20 bg-slate-900 px-3 text-sm text-white focus-ring"
                onChange={(event) => {
                  setSelectedDeviceId(event.target.value);
                  if (scanning) {
                    stopScanner();
                    setMessage("Đã chọn camera mới. Nhấn Mở camera để tiếp tục quét.");
                  }
                }}
                value={selectedDeviceId}
              >
                {devices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${device.deviceId.slice(0, 6)}`}</option>
                ))}
              </select>
            </label>
          )}
        </section>

        <aside className="min-w-0 space-y-4 px-4 md:px-0">
          {message && (
            <div
              aria-live="polite"
              className={`rounded-2xl border p-4 ${result ? "border-emerald-200 bg-emerald-50 text-emerald-800" : submitting ? "border-primary/20 bg-primary-fixed text-primary" : "border-error/20 bg-error-container text-error"}`}
            >
              <div className="flex items-start gap-3">
                {result ? <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" /> : submitting ? <Loader2 className="mt-0.5 h-6 w-6 shrink-0 animate-spin" /> : <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0" />}
                <p className="text-sm font-bold leading-6">{message}</p>
              </div>
            </div>
          )}

          {result && (
            <section className="panel p-5">
              <p className="text-xs font-bold uppercase text-emerald-700">Điểm danh thành công</p>
              <h2 className="mt-1 text-xl font-bold text-on-surface">{result.activityTitle || activity?.title || "Hoạt động"}</h2>
              <p className="mt-3 font-semibold text-on-surface">{result.studentCode} · {result.fullName}</p>
              {(result.finalLocationVerified || result.middleLocationVerified) && (
                <p className="mt-2 text-sm text-on-surface-variant">Vị trí hợp lệ: {Math.round(result.finalDistanceMeters ?? result.middleDistanceMeters ?? 0)}m từ điểm tạo QR</p>
              )}
              <p className="mt-1 text-sm text-on-surface-variant">
                {result.finalCheckinTime || result.middleCheckinTime || result.checkinTime
                  ? formatDateTime(result.finalCheckinTime || result.middleCheckinTime || result.checkinTime)
                  : "Vừa xong"}
              </p>
              <button
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 py-3 font-bold text-primary"
                onClick={() => {
                  setResult(null);
                  setMessage("");
                }}
                type="button"
              >
                <RefreshCw className="h-5 w-5" />
                Quét mã khác
              </button>
            </section>
          )}

          <section className="panel p-5">
            <p className="text-xs font-bold uppercase text-primary">Cách quét nhanh</p>
            <h2 className="mt-1 text-lg font-bold text-on-surface">Đưa QR vào giữa khung</h2>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-on-surface-variant">
              <li className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">1</span><span>Cho phép trình duyệt sử dụng camera sau.</span></li>
              <li className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">2</span><span>Giữ mã QR đủ sáng, nằm trọn trong bốn góc của khung.</span></li>
              <li className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">3</span><span>Giữ yên một chút; hệ thống sẽ tự quét và ghi nhận.</span></li>
            </ol>
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-surface-container-low p-3 text-xs leading-5 text-on-surface-variant">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Hệ thống có thể yêu cầu quyền vị trí để xác nhận bạn đang ở đúng khu vực điểm danh.
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default StudentActivityQrCheckinPage;
