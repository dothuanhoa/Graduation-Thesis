import { LogOut, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import StudentSidebar from "../components/StudentSidebar";
import { useAuth } from "../context/useAuth";
import { studentBottomNav } from "../data/studentPortalData";
import { activityApi, type ActivityResponse } from "../services/api";
import { isActivityScanActive } from "../utils/activityUi";

export type StudentLayoutContext = {
  checkerActivities: ActivityResponse[];
};

const getInitials = (value: string) => {
  if (!value) return "SV";
  const words = value.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
};

function StudentLayout() {
  const { logout, username } = useAuth();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem("studentSidebarCollapsed") === "true");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [checkerActivities, setCheckerActivities] = useState<ActivityResponse[]>([]);
  const canScanAttendance = checkerActivities.length > 0;
  const displayName = username || "Sinh viên";
  const visibleBottomNav = studentBottomNav.filter((item) => canScanAttendance || item.path !== "/checker/scan");
  const accountActions = [
    { label: "Hồ sơ", path: "/student/profile", icon: UserRound },
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

  useEffect(() => {
    localStorage.setItem("studentSidebarCollapsed", String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    let isMounted = true;

    const timerId = window.setTimeout(async () => {
      if (!username) {
        if (isMounted) {
          setCheckerActivities([]);
        }
        return;
      }

      try {
        const checkerActivities = await activityApi.listMyCheckerActivities({ suppressToast: true }).catch(() => []);
        if (isMounted) {
          setCheckerActivities(checkerActivities.filter((activity) => isActivityScanActive(activity)));
        }
      } catch {
        if (isMounted) {
          setCheckerActivities([]);
        }
      }
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timerId);
    };
  }, [username]);

  const handleToggleSidebar = () => {
    if (window.matchMedia("(min-width: 768px)").matches) {
      setIsSidebarCollapsed((current) => !current);
      return;
    }

    setIsMobileSidebarOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-background text-on-background">
      <StudentSidebar canScanAttendance={canScanAttendance} collapsed={isSidebarCollapsed} studentCode={username} studentName={displayName} />
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Đóng sidebar"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => setIsMobileSidebarOpen(false)}
            type="button"
          />
          <div className="relative h-full w-[282px] max-w-[86vw] bg-surface-container-lowest shadow-raised">
            <button
              aria-label="Đóng sidebar"
              className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-lowest text-primary"
              onClick={() => setIsMobileSidebarOpen(false)}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
            <StudentSidebar canScanAttendance={canScanAttendance} isMobile onNavigate={() => setIsMobileSidebarOpen(false)} studentCode={username} studentName={displayName} />
          </div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col pb-24 md:pb-0">
        <Header
          accountActions={accountActions}
          initials={getInitials(displayName)}
          isSidebarCollapsed={isSidebarCollapsed}
          mobileTitle="Cổng sinh viên"
          onToggleSidebar={handleToggleSidebar}
          roleLabel="Sinh viên"
          searchPlaceholder="Tìm thông báo, kỳ thi, hoạt động, đơn xác nhận..."
          userName={displayName}
        />
        <main className="flex-1 px-4 py-6 md:px-padding-page md:py-padding-page">
          <div className="mx-auto flex max-w-container-max flex-col gap-gutter">
            <Outlet context={{ checkerActivities } satisfies StudentLayoutContext} />
          </div>
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-outline-variant bg-surface-container-lowest px-2 py-2 shadow-raised md:hidden">
        {visibleBottomNav.map((item) => {
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
