import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import type { NavItem } from "../data/mockData";

type SidebarProps = {
  items: NavItem[];
  utilityItems?: NavItem[];
  title?: string;
  subtitle?: string;
  collapsed?: boolean;
  isMobile?: boolean;
  onNavigate?: () => void;
};

const linkClass = (collapsed: boolean) =>
({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg border-l-4 py-3 text-sm font-semibold transition ${
    collapsed ? "justify-center px-2" : "px-4"
  } ${
    isActive
      ? "border-primary bg-secondary-container text-primary"
      : "border-transparent text-on-surface-variant hover:bg-surface-container-high"
  }`;

function Sidebar({
  items,
  utilityItems = [],
  title = "Quản lý CTSV",
  subtitle = "Hệ thống quản trị",
  collapsed = false,
  isMobile = false,
  onNavigate,
}: SidebarProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    onNavigate?.();
    navigate("/login", { replace: true });
  };

  return (
    <aside
      className={`${isMobile ? "flex h-full w-full" : "sticky top-0 hidden h-screen md:flex"} ${
        collapsed && !isMobile ? "w-20 px-3" : "w-sidebar-width px-4"
      } flex-shrink-0 flex-col border-r border-outline-variant bg-surface-container-lowest py-padding-page shadow-sm transition-all duration-200`}
    >
      <div className={`mb-8 flex items-center gap-3 ${collapsed && !isMobile ? "justify-center px-0" : "px-4"}`}>
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary-container">
          <img alt="STU" className="h-9 w-9 object-contain" src="/Logo_STU.png" />
        </div>
        <div className={`min-w-0 ${collapsed && !isMobile ? "hidden" : ""}`}>
          <p className="truncate text-xl font-bold text-primary">{title}</p>
          <p className="truncate text-sm text-on-surface-variant">{subtitle}</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.path} aria-label={item.label} className={linkClass(collapsed && !isMobile)} onClick={onNavigate} title={collapsed && !isMobile ? item.label : undefined} to={item.path}>
              <Icon className="h-5 w-5" />
              <span className={collapsed && !isMobile ? "sr-only" : ""}>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      {utilityItems.length > 0 && (
        <nav className="mt-4 flex flex-col gap-2 border-t border-outline-variant pt-4">
          {utilityItems.map((item) => {
            const Icon = item.icon;
            if (item.path === "/login") {
              return (
                <button
                  key={item.path}
                  className={`flex items-center gap-3 rounded-lg border-l-4 border-transparent py-3 text-left text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container-high ${
                    collapsed && !isMobile ? "justify-center px-2" : "px-4"
                  }`}
                  onClick={handleLogout}
                  title={collapsed && !isMobile ? item.label : undefined}
                  type="button"
                >
                  <Icon className="h-5 w-5" />
                  <span className={collapsed && !isMobile ? "sr-only" : ""}>{item.label}</span>
                </button>
              );
            }

            return (
              <NavLink key={item.path} aria-label={item.label} className={linkClass(collapsed && !isMobile)} onClick={onNavigate} title={collapsed && !isMobile ? item.label : undefined} to={item.path}>
                <Icon className="h-5 w-5" />
                <span className={collapsed && !isMobile ? "sr-only" : ""}>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      )}
    </aside>
  );
}

export default Sidebar;
