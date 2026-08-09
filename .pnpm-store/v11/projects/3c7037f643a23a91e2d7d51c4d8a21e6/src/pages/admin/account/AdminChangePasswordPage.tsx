import { KeyRound, Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../../../components/BackButton";
import Card from "../../../components/Card";
import FormField from "../../../components/FormField";
import PageHeader from "../../../components/PageHeader";
import { useAuth } from "../../../context/useAuth";
import { authApi } from "../../../services/api";

function AdminChangePasswordPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (newPassword.length < 6) {
      setMessage("Mật khẩu mới cần tối thiểu 6 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("Mật khẩu xác nhận chưa khớp.");
      return;
    }

    setSaving(true);
    try {
      const response = await authApi.changePassword({
        oldPassword,
        newPassword,
      });
      setMessage(response.message || "Đổi mật khẩu thành công. Vui lòng đăng nhập lại.");
      window.setTimeout(() => {
        auth.logout();
        navigate("/login", { replace: true });
      }, 1600);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không đổi được mật khẩu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-gutter">
      <BackButton to="/admin/dashboard">Quay lại Dashboard</BackButton>

      <PageHeader
        title="Đổi mật khẩu quản trị"
        subtitle="Cập nhật mật khẩu định kỳ cho tài khoản admin để đảm bảo an toàn truy cập hệ thống."
      />

      <Card className="max-w-2xl">
        {message && <div className="mb-5 rounded-lg bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">{message}</div>}
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <FormField
            label="Mật khẩu hiện tại"
            onChange={(event) => setOldPassword(event.target.value)}
            required
            type="password"
            value={oldPassword}
          />
          <FormField
            label="Mật khẩu mới"
            onChange={(event) => setNewPassword(event.target.value)}
            required
            type="password"
            value={newPassword}
          />
          <FormField
            label="Nhập lại mật khẩu mới"
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            type="password"
            value={confirmPassword}
          />
          <button
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary disabled:opacity-60"
            disabled={saving}
            type="submit"
          >
            {saving ? <KeyRound className="h-5 w-5 animate-pulse" /> : <Save className="h-5 w-5" />}
            {saving ? "Đang đổi mật khẩu..." : "Đổi mật khẩu"}
          </button>
        </form>
      </Card>
    </div>
  );
}

export default AdminChangePasswordPage;
