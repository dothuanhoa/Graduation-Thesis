import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import type { NavItem } from "../data/mockData";

type SidebarProps = {
  items: NavItem[];
  utilityItems?: NavItem[];
  title?: string;
  subtitle?: string;
};

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg border-l-4 px-4 py-3 text-sm font-semibold transition ${
    isActive
      ? "border-primary bg-secondary-container text-primary"
      : "border-transparent text-on-surface-variant hover:bg-surface-container-high"
  }`;

function Sidebar({ items, utilityItems = [], title = "Quản lý CTSV", subtitle = "Hệ thống quản trị" }: SidebarProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="hidden h-screen w-sidebar-width flex-shrink-0 flex-col border-r border-outline-variant bg-surface-container-lowest px-4 py-padding-page shadow-sm md:flex">
      <div className="mb-10 flex items-center gap-3 px-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-container">
          <img alt="STU" className="h-9 w-9 object-contain" src="/Logo_STU.png" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xl font-bold text-primary">{title}</p>
          <p className="truncate text-sm text-on-surface-variant">{subtitle}</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.path} className={linkClass} to={item.path}>
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
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
                  className="flex items-center gap-3 rounded-lg border-l-4 border-transparent px-4 py-3 text-left text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container-high"
                  onClick={handleLogout}
                  type="button"
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              );
            }

            return (
              <NavLink key={item.path} className={linkClass} to={item.path}>
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      )}
    </aside>
  );
}

export default Sidebar;
