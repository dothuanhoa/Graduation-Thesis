import { LogOut, Settings, UserRound } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import StudentSidebar from "../components/StudentSidebar";
import { useAuth } from "../context/useAuth";
import { studentBottomNav } from "../data/studentPortalData";

const getInitials = (value: string) => {
  if (!value) return "SV";
  const words = value.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
};

function StudentLayout() {
  const { logout, username } = useAuth();
  const navigate = useNavigate();
  const displayName = username || "Sinh viên";
  const accountActions = [
    { label: "Hồ sơ", path: "/student/profile", icon: UserRound },
    { label: "Cài đặt", path: "/student/settings", icon: Settings },
    {
      label: "Đăng xuất",
      path: "/login",
      icon: LogOut,
      onClick: () => {
        logout();
        navigate("/login", { replace: true });
      },
    },
  ];

  return (
    <div className="flex min-h-screen bg-background text-on-background">
      <StudentSidebar studentCode={username} studentName={displayName} />
      <div className="flex min-w-0 flex-1 flex-col pb-24 md:pb-0">
        <Header
          accountActions={accountActions}
          initials={getInitials(displayName)}
          mobileTitle="Cổng sinh viên"
          roleLabel="Sinh viên"
          searchPlaceholder="Tìm thông báo, kỳ thi, hoạt động, đơn xác nhận..."
          userName={displayName}
        />
        <main className="flex-1 px-4 py-6 md:px-padding-page md:py-padding-page">
          <div className="mx-auto flex max-w-container-max flex-col gap-gutter">
            <Outlet />
          </div>
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-outline-variant bg-surface-container-lowest px-2 py-2 shadow-raised md:hidden">
        {studentBottomNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              className={({ isActive }) =>
                `flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-semibold ${
                  isActive ? "bg-primary text-on-primary" : "text-on-surface-variant"
                }`
              }
              to={item.path}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="w-full truncate text-center">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

export default StudentLayout;
