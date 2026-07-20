import { KeyRound, LogOut, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/useAuth";
import { adminNav } from "../data/mockData";

const getInitials = (value: string) => {
  if (!value) return "AD";
  const words = value.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
};

function AdminLayout() {
  const { logout, username } = useAuth();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem("adminSidebarCollapsed") === "true");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const displayName = username || "Quản trị viên";
  const accountActions = [
    {
      label: "Đổi mật khẩu",
      path: "/admin/change-password",
      icon: KeyRound,
    },
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
    localStorage.setItem("adminSidebarCollapsed", String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const handleToggleSidebar = () => {
    if (window.matchMedia("(min-width: 768px)").matches) {
      setIsSidebarCollapsed((current) => !current);
      return;
    }

    setIsMobileSidebarOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-background text-on-background">
      <Sidebar collapsed={isSidebarCollapsed} items={adminNav} />
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
            <Sidebar isMobile items={adminNav} onNavigate={() => setIsMobileSidebarOpen(false)} />
          </div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          accountActions={accountActions}
          initials={getInitials(displayName)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
          userName={displayName}
        />
        <main className="flex-1 px-4 py-6 md:px-padding-page md:py-padding-page">
          <div className="mx-auto flex max-w-container-max flex-col gap-gutter">
            <Outlet />
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
