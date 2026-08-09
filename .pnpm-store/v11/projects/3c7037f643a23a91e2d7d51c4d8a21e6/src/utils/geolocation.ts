export type BrowserLocation = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
};

const geolocationErrorMessage = (error: GeolocationPositionError) => {
  if (error.code === error.PERMISSION_DENIED) {
    return "Trình duyệt chưa được cấp quyền truy cập vị trí. Vui lòng cho phép quyền vị trí rồi thử lại.";
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Không xác định được vị trí hiện tại. Vui lòng kiểm tra GPS/Wi-Fi/mạng rồi thử lại.";
  }
  if (error.code === error.TIMEOUT) {
    return "Lấy vị trí hiện tại quá lâu. Vui lòng đứng ở nơi có tín hiệu tốt hơn rồi thử lại.";
  }
  return "Không lấy được vị trí hiện tại. Vui lòng thử lại.";
};

export const getCurrentBrowserLocation = (timeoutMs = 10_000): Promise<BrowserLocation> =>
  new Promise((resolve, reject) => {
    if (!window.isSecureContext) {
      reject(new Error("Trình duyệt chỉ cho phép lấy vị trí trên HTTPS hoặc localhost."));
      return;
    }

    if (!navigator.geolocation) {
      reject(new Error("Thiết bị hoặc trình duyệt hiện tại không hỗ trợ lấy vị trí."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        });
      },
      (error) => reject(new Error(geolocationErrorMessage(error))),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: timeoutMs,
      },
    );
  });
