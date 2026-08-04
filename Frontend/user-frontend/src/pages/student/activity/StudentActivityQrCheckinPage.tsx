import { BrowserCodeReader, BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { Camera, CheckCircle2, RefreshCw, StopCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BackButton from "../../../components/BackButton";
import Card from "../../../components/Card";
import PageHeader from "../../../components/PageHeader";
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
  const [message, setMessage] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastScanRef = useRef("");

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    BrowserCodeReader.releaseAllStreams();
    setScanning(false);
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
        setResult(checked);
        setMessage("Đã ghi nhận điểm danh bằng QR.");
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Không ghi nhận được điểm danh bằng QR.");
      } finally {
        setSubmitting(false);
      }
    },
    [id, submitting],
  );

  const startScanner = useCallback(async () => {
    if (!videoRef.current) {
      setMessage("Khong tim thay khung camera.");
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
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      const reader = new BrowserMultiFormatReader(hints, {
        delayBetweenScanAttempts: 250,
        delayBetweenScanSuccess: 900,
      });

      const controls = await reader.decodeFromVideoDevice(nextDeviceId || undefined, videoRef.current, (scanResult) => {
        if (!scanResult) return;
        const payload = extractQrPayload(scanResult.getText());
        if (!payload || payload === lastScanRef.current) return;
        lastScanRef.current = payload;
        window.setTimeout(() => {
          if (lastScanRef.current === payload) lastScanRef.current = "";
        }, 1800);
        void submitQr(payload);
      });

      controlsRef.current = controls;
      setScanning(true);
    } catch (err) {
      setScanning(false);
      setMessage(err instanceof Error ? err.message : "Không mở được camera. Vui lòng kiểm tra quyền camera.");
    }
  }, [selectedDeviceId, stopScanner, submitQr]);

  if (loading) {
    return <div className="panel p-6 text-on-surface-variant">Đang tải trang quét QR...</div>;
  }

  return (
    <div className="space-y-gutter">
      <BackButton to={id ? `/student/activities/${id}` : "/student/activities"}>{id ? "Quay lại hoạt động" : "Quay lại danh sách hoạt động"}</BackButton>
      <PageHeader title="Quét QR điểm danh" subtitle={activity ? activity.title : "Quét mã QR do admin tạo để ghi nhận lần điểm danh trong giờ."} />

      {message && <div className="rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">{message}</div>}

      <div className="grid gap-gutter lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-primary">Camera</p>
              <h2 className="text-xl font-bold text-on-surface">Quét mã QR</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary disabled:opacity-60" disabled={submitting} onClick={() => void startScanner()} type="button">
                <Camera className="h-5 w-5" />
                {scanning ? "Quét lại" : "Mở camera"}
              </button>
              {scanning && (
                <button className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" onClick={stopScanner} type="button">
                  <StopCircle className="h-5 w-5" />
                  Dừng
                </button>
              )}
            </div>
          </div>

          {devices.length > 1 && (
            <label className="mt-4 flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-on-surface">Chọn camera</span>
              <select className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface focus-ring" onChange={(event) => setSelectedDeviceId(event.target.value)} value={selectedDeviceId}>
                {devices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${device.deviceId.slice(0, 6)}`}</option>
                ))}
              </select>
            </label>
          )}

          <video ref={videoRef} className="mt-5 aspect-video w-full rounded-lg bg-black object-cover" muted playsInline />
        </Card>

        <Card>
          <p className="text-sm font-semibold text-primary">Điểm danh bằng QR</p>
          <h2 className="text-xl font-bold text-on-surface">Quét mã do phòng CTSV hiển thị</h2>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">
            Sinh viên chỉ cần mở camera và đưa mã QR vào khung quét. Hệ thống sẽ tự đọc nội dung QR, kiểm tra phiên điểm danh hợp lệ và ghi nhận kết quả cho tài khoản đang đăng nhập.
          </p>
          {submitting && <p className="mt-4 rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">Đang gửi mã QR vừa quét...</p>}

          {result && (
            <div className="mt-5 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">
              <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5" /> Đã ghi nhận</p>
              {result.activityTitle && <p className="mt-2 font-semibold">{result.activityTitle}</p>}
              <p className="mt-2">{result.studentCode} - {result.fullName}</p>
              {(result.finalLocationVerified || result.middleLocationVerified) && (
                <p>Vị trí hợp lệ: {Math.round(result.finalDistanceMeters ?? result.middleDistanceMeters ?? 0)}m từ điểm tạo QR</p>
              )}
              <p>{result.finalCheckinTime || result.middleCheckinTime || result.checkinTime ? formatDateTime(result.finalCheckinTime || result.middleCheckinTime || result.checkinTime) : "Vừa xong"}</p>
            </div>
          )}

          <button className="mt-4 inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary" onClick={() => setResult(null)} type="button">
            <RefreshCw className="h-5 w-5" />
            Xóa kết quả hiện tại
          </button>
        </Card>
      </div>
    </div>
  );
}

export default StudentActivityQrCheckinPage;
