import { Mail, Phone, RefreshCw, Save, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Card from "../../../components/Card";
import FormField from "../../../components/FormField";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import { useAuth } from "../../../context/useAuth";
import { profileTimeline } from "../../../data/studentPortalData";
import { userApi, type UserProfile } from "../../../services/api";
import { contactPhoneSchema } from "../../../validation/userSchemas";

const genderLabel: Record<string, string> = {
  MALE: "Nam",
  FEMALE: "Nữ",
  OTHER: "Khác",
};

const statusText: Record<string, string> = {
  STUDYING: "Đang học",
  RESERVED: "Bảo lưu",
  SUSPENDED: "Đình chỉ",
  GRADUATED: "Đã tốt nghiệp",
};

const formatDate = (value?: string) => {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN").format(date);
};

function InfoItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
      <p className="text-xs font-bold uppercase text-outline">{label}</p>
      <p className="mt-2 break-words font-semibold text-on-surface">{value || "Chưa cập nhật"}</p>
    </div>
  );
}

function StudentProfilePage() {
  const { username } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [contactPhone, setContactPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const studentEmail = useMemo(() => {
    const studentId = profile?.studentId || username;
    return studentId ? `${studentId}@student.stu.edu.vn` : "Chưa cập nhật";
  }, [profile?.studentId, username]);

  const loadProfile = useCallback(async () => {
    if (!username) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const data = await userApi.getByStudentId(username);
      setProfile(data);
      setContactPhone(data?.contactPhone || "");
      if (!data) {
        setMessage("Chưa tìm thấy hồ sơ sinh viên tương ứng với tài khoản đang đăng nhập.");
      }
    } catch (err) {
      setProfile(null);
      setMessage(err instanceof Error ? err.message : "Không tải được hồ sơ sinh viên.");
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadProfile]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setSaving(true);

    try {
      await contactPhoneSchema.validate({ contactPhone });
      const updated = await userApi.updateMyContact(contactPhone);
      setProfile(updated);
      setContactPhone(updated.contactPhone || "");
      setMessage("Đã cập nhật số điện thoại liên hệ.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không cập nhật được liên hệ.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-gutter">
      <PageHeader
        title="Hồ sơ sinh viên"
        subtitle="Xem thông tin cá nhân, lớp, khoa, trạng thái học tập và cập nhật số điện thoại liên hệ."
      />

      {message && (
        <div className="rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-sm font-semibold text-primary">
          {message}
        </div>
      )}

      <section className="grid gap-gutter xl:grid-cols-[360px_1fr]">
        <Card className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-primary text-2xl font-bold text-on-primary">
              {(profile?.fullName || username || "SV").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xl font-bold text-on-surface">{profile?.fullName || username || "Sinh viên"}</p>
              <p className="mt-1 text-sm font-semibold text-primary">{profile?.studentId || username || "Chưa có MSSV"}</p>
            </div>
          </div>

          <div className="space-y-3 border-t border-outline-variant pt-4">
            <div className="flex items-center gap-3 text-sm text-on-surface-variant">
              <Mail className="h-5 w-5 text-primary" />
              <span className="break-all">{studentEmail}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-on-surface-variant">
              <Phone className="h-5 w-5 text-primary" />
              <span>{profile?.contactPhone || contactPhone || "Chưa cập nhật số điện thoại"}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-outline-variant pt-4">
            <span className="text-sm font-semibold text-on-surface-variant">Trạng thái</span>
            {profile?.studentStatus ? <StatusBadge status={profile.studentStatus} /> : <StatusBadge status="PENDING" />}
          </div>
        </Card>

        <div className="space-y-gutter">
          <Card>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-primary">Thông tin học vụ</p>
                <h2 className="text-xl font-bold text-on-surface">Thông tin cá nhân và lớp</h2>
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm font-semibold text-primary hover:bg-surface-container-low"
                onClick={loadProfile}
                type="button"
              >
                <RefreshCw className="h-4 w-4" />
                Tải lại
              </button>
            </div>

            {loading ? (
              <div className="rounded-lg bg-surface-container-low px-4 py-6 text-sm text-on-surface-variant">Đang tải hồ sơ...</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <InfoItem label="MSSV" value={profile?.studentId || username} />
                <InfoItem label="Họ và tên" value={profile?.fullName} />
                <InfoItem label="Ngày sinh" value={formatDate(profile?.dob)} />
                <InfoItem label="Giới tính" value={profile?.gender ? genderLabel[profile.gender] : ""} />
                <InfoItem label="Lớp" value={profile?.clazz?.classCode} />
                <InfoItem label="Khoa" value={profile?.clazz?.faculty?.facultyName || profile?.clazz?.faculty?.facultyCode} />
                <InfoItem label="Email sinh viên" value={studentEmail} />
                <InfoItem label="Điện thoại" value={profile?.contactPhone} />
                <InfoItem label="Tình trạng" value={profile?.studentStatus ? statusText[profile.studentStatus] : ""} />
              </div>
            )}
          </Card>

          <Card>
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-lg bg-primary-fixed p-3 text-primary">
                <UserRound className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">Tự phục vụ</p>
                <h2 className="text-xl font-bold text-on-surface">Cập nhật số điện thoại liên hệ</h2>
              </div>
            </div>
            <form className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end" onSubmit={handleSubmit}>
              <FormField
                label="Số điện thoại liên hệ"
                onChange={(event) => setContactPhone(event.target.value)}
                placeholder="090..."
                required
                value={contactPhone}
              />
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary disabled:opacity-60"
                disabled={saving}
                type="submit"
              >
                <Save className="h-5 w-5" />
                {saving ? "Đang lưu" : "Lưu thay đổi"}
              </button>
            </form>
          </Card>
        </div>
      </section>

      <Card>
        <div className="mb-5">
          <p className="text-sm font-semibold text-primary">Tiến trình hồ sơ</p>
          <h2 className="text-xl font-bold text-on-surface">Các bước xử lý dữ liệu sinh viên</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {profileTimeline.map((item) => (
            <div key={item.title} className="rounded-lg border border-outline-variant p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="font-bold text-on-surface">{item.title}</p>
                <StatusBadge status={item.status} />
              </div>
              <p className="text-sm text-on-surface-variant">{item.time}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default StudentProfilePage;
