import { CheckCircle2, KeyRound, Lock } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";
import BackButton from "../../components/BackButton";
import Card from "../../components/Card";
import FormField from "../../components/FormField";
import { authApi } from "../../services/api";
import {
  formatStrongPasswordIssues,
  strongPasswordHint,
} from "../../validation/passwordValidation";
import { reportFormError, scrollToFormMessage } from "../../utils/formFeedback";

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(1, "Vui lòng nhập mật khẩu mới."),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu mới."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Xác nhận mật khẩu mới chưa khớp.",
    path: ["confirmPassword"],
  });

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(token ? "" : "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
  const [loading, setLoading] = useState(false);
  const messageRef = useRef<HTMLDivElement | null>(null);

  const showError = (errorMessage: string, toast = true) => {
    setError(errorMessage);
    if (toast) {
      reportFormError(errorMessage, messageRef.current);
    } else {
      scrollToFormMessage(messageRef.current);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!token) {
      showError("Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
      return;
    }

    const passwordIssueMessage = formatStrongPasswordIssues(newPassword);
    if (passwordIssueMessage) {
      showError(passwordIssueMessage);
      return;
    }

    const parsed = resetPasswordSchema.safeParse({ newPassword, confirmPassword });
    if (!parsed.success) {
      showError(parsed.error.issues[0]?.message ?? "Vui lòng kiểm tra lại mật khẩu.");
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.resetForgotPassword({
        token,
        newPassword: parsed.data.newPassword,
      });
      setMessage(response.message || "Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Không đặt lại được mật khẩu. Vui lòng thử lại.", false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[460px]">
      <Card className="p-8">
        <BackButton className="mb-6" to="/login">Quay lại đăng nhập</BackButton>

        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-outline-variant bg-surface-container-low">
          <KeyRound className="h-10 w-10 text-primary" />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-on-surface">Đặt mật khẩu mới</h1>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            Nhập mật khẩu mới cho tài khoản của bạn. Sau khi cập nhật, hãy đăng nhập lại bằng mật khẩu vừa tạo.
          </p>
        </div>

        {message && (
          <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{message}</span>
            </div>
          </div>
        )}

        {error && (
          <div
            className="mt-5 rounded-lg border border-error-container bg-error-container px-4 py-3 text-sm font-semibold text-error"
            data-form-message
            ref={messageRef}
          >
            {error}
          </div>
        )}

        {!message && (
          <form autoComplete="off" className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
            <FormField
              autoComplete="new-password"
              icon={<Lock className="h-5 w-5" />}
              label="Mật khẩu mới"
              hint={strongPasswordHint}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Ví dụ: Stu@2026"
              type="password"
              value={newPassword}
            />
            <FormField
              autoComplete="new-password"
              icon={<Lock className="h-5 w-5" />}
              label="Xác nhận mật khẩu mới"
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              type="password"
              value={confirmPassword}
            />

            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary shadow-panel transition hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading || !token}
              type="submit"
            >
              {loading ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
              <KeyRound className="h-5 w-5" />
            </button>
          </form>
        )}
      </Card>
    </div>
  );
}

export default ResetPasswordPage;
