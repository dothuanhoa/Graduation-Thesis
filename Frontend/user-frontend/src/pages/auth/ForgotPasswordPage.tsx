import { Mail, Send } from "lucide-react";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import BackButton from "../../components/BackButton";
import Card from "../../components/Card";
import FormField from "../../components/FormField";
import { authApi } from "../../services/api";

const forgotPasswordSchema = z.object({
  usernameOrEmail: z.string().trim().min(1, "Vui lòng nhập MSSV hoặc email."),
});

function ForgotPasswordPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");

    const parsed = forgotPasswordSchema.safeParse({ usernameOrEmail });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Vui lòng kiểm tra lại thông tin.");
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.forgotPassword(parsed.data);
      setMessage(response.message || "Nếu thông tin hợp lệ, hệ thống đã gửi email hướng dẫn đặt lại mật khẩu.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không gửi được yêu cầu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[460px]">
      <Card className="p-8">
        <BackButton className="mb-6" to="/login">Quay lại đăng nhập</BackButton>

        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-outline-variant bg-surface-container-low">
          <img alt="STU" className="h-14 w-14 object-contain" src="/Logo_STU.png" />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-on-surface">Quên mật khẩu</h1>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            Nhập MSSV hoặc email đã đăng ký. Hệ thống sẽ gửi liên kết đặt lại mật khẩu đến email của bạn.
          </p>
        </div>

        {message && (
          <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-lg border border-error-container bg-error-container px-4 py-3 text-sm font-semibold text-error">
            {error}
          </div>
        )}

        <form autoComplete="off" className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
          <FormField
            autoComplete="off"
            icon={<Mail className="h-5 w-5" />}
            label="MSSV hoặc email"
            onChange={(event) => setUsernameOrEmail(event.target.value)}
            placeholder="Ví dụ: DH52201258 hoặc email sinh viên"
            value={usernameOrEmail}
          />

          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary shadow-panel transition hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? "Đang gửi yêu cầu..." : "Gửi liên kết đặt lại mật khẩu"}
            <Send className="h-5 w-5" />
          </button>
        </form>
      </Card>
    </div>
  );
}

export default ForgotPasswordPage;
