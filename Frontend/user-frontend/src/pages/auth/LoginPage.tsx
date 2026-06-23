import { Lock, LogIn, UserRound } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/Card";
import FormField from "../../components/FormField";
import { useAuth } from "../../context/useAuth";
import { ApiError } from "../../services/api";
import { getDashboardPath } from "../../utils/authRouting";

const getRoleFromToken = (token: string) => {
  try {
    const payload = token.split(".")[1] || "";
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized)).role || "STUDENT";
  } catch {
    return "STUDENT";
  }
};

function LoginPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectByRole = (role: string) => {
    navigate(getDashboardPath(role), { replace: true });
  };

  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate(getDashboardPath(auth.role), { replace: true });
    }
  }, [auth.isAuthenticated, auth.role, navigate]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await auth.login({ username, password });
      redirectByRole(getRoleFromToken(localStorage.getItem("accessToken") || ""));
    } catch (err) {
      if (err instanceof ApiError && err.status === 428) {
        setNeedsPasswordChange(true);
        setError("Tài khoản cần đổi mật khẩu lần đầu trước khi vào hệ thống.");
      } else {
        setError(err instanceof Error ? err.message : "Không đăng nhập được. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFirstChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("Mật khẩu mới cần tối thiểu 6 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Xác nhận mật khẩu mới chưa khớp.");
      return;
    }

    setLoading(true);
    try {
      await auth.firstChangePassword({ username, oldPassword: password, newPassword });
      redirectByRole(getRoleFromToken(localStorage.getItem("accessToken") || ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đổi được mật khẩu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[430px]">
      <Card className="p-8 text-center">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-outline-variant bg-surface-container-low">
          <img alt="STU" className="h-14 w-14 object-contain" src="/Logo_STU.png" />
        </div>
        <h1 className="text-2xl font-bold text-on-surface">Đăng nhập hệ thống</h1>
        <p className="mt-2 text-on-surface-variant">Cổng thông tin sinh viên và cán bộ CTSV</p>

        {error && (
          <div className="mt-5 rounded-lg border border-error-container bg-error-container px-4 py-3 text-left text-sm font-semibold text-error">
            {error}
          </div>
        )}

        {!needsPasswordChange ? (
          <form className="mt-8 flex flex-col gap-5 text-left" onSubmit={handleLogin}>
            <FormField
              icon={<UserRound className="h-5 w-5" />}
              label="MSSV / Tên đăng nhập"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Nhập mã sinh viên hoặc tên"
              value={username}
            />
            <FormField
              icon={<Lock className="h-5 w-5" />}
              label="Mật khẩu"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Nhập mật khẩu của bạn"
              type="password"
              value={password}
            />
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary shadow-panel transition hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              <LogIn className="h-5 w-5" />
            </button>
          </form>
        ) : (
          <form className="mt-8 flex flex-col gap-5 text-left" onSubmit={handleFirstChangePassword}>
            <FormField
              icon={<Lock className="h-5 w-5" />}
              label="Mật khẩu mới"
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Nhập mật khẩu mới"
              type="password"
              value={newPassword}
            />
            <FormField
              icon={<Lock className="h-5 w-5" />}
              label="Xác nhận mật khẩu mới"
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              type="password"
              value={confirmPassword}
            />
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary shadow-panel transition hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? "Đang cập nhật..." : "Đổi mật khẩu và vào hệ thống"}
              <LogIn className="h-5 w-5" />
            </button>
          </form>
        )}

        <div className="mt-8 border-t border-outline-variant pt-5 text-sm text-on-surface-variant">
          Gặp sự cố khi đăng nhập? <span className="font-semibold text-primary">Liên hệ hỗ trợ</span>
        </div>
      </Card>
      <p className="mt-6 text-center text-sm text-on-surface-variant">© 2026 Hệ thống Quản lý CTSV</p>
    </div>
  );
}

export default LoginPage;
