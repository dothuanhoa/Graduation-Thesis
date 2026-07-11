import { NavLink } from "react-router-dom";
import { studentMainNav, type StudentNavItem } from "../data/studentPortalData";

type StudentSidebarProps = {
  studentName?: string;
  studentCode?: string;
  canScanAttendance?: boolean;
  collapsed?: boolean;
  isMobile?: boolean;
  onNavigate?: () => void;
};

const linkClass = (collapsed: boolean) =>
({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg py-2.5 text-sm font-semibold transition ${
    collapsed ? "justify-center px-2" : "px-3"
  } ${
    isActive
      ? "bg-primary text-on-primary shadow-panel"
      : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
  }`;

function NavGroup({ title, items, collapsed, onNavigate }: { title: string; items: StudentNavItem[]; collapsed: boolean; onNavigate?: () => void }) {
  return (
    <div className="space-y-2">
      {!collapsed && <p className="px-3 text-xs font-bold uppercase text-outline">{title}</p>}
      <nav className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.path} aria-label={item.label} className={linkClass(collapsed)} onClick={onNavigate} title={collapsed ? item.label : undefined} to={item.path}>
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className={collapsed ? "sr-only" : "truncate"}>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

function StudentSidebar({ studentName = "Sinh viên", studentCode = "", canScanAttendance = false, collapsed = false, isMobile = false, onNavigate }: StudentSidebarProps) {
  const sidebarMainNav = studentMainNav.filter((item) => item.path !== "/student/profile" && (canScanAttendance || item.path !== "/checker/scan"));
  const isCollapsed = collapsed && !isMobile;

  return (
    <aside
      className={`${isMobile ? "flex h-full w-full" : "sticky top-0 hidden h-screen md:flex"} ${
        isCollapsed ? "w-20 px-3" : "w-[282px] px-4"
      } flex-shrink-0 flex-col border-r border-outline-variant bg-surface-container-lowest py-6 transition-all duration-200`}
    >
      <div className={`mb-6 flex items-center gap-3 ${isCollapsed ? "justify-center px-0" : "px-2"}`}>
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary-fixed">
          <img alt="STU" className="h-9 w-9 object-contain" src="/Logo_STU.png" />
        </div>
        <div className={`min-w-0 ${isCollapsed ? "hidden" : ""}`}>
          <p className="truncate text-lg font-bold text-primary">Cổng sinh viên</p>
          <p className="truncate text-xs font-semibold text-on-surface-variant">Phòng Công tác sinh viên</p>
        </div>
      </div>

      {!isCollapsed && (
        <div className="mb-6 rounded-lg border border-outline-variant bg-surface-container-low p-4">
          <p className="truncate text-sm font-bold text-on-surface">{studentName}</p>
          <p className="mt-1 text-xs font-semibold text-primary">{studentCode || "Tài khoản sinh viên"}</p>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pr-1">
        <NavGroup collapsed={isCollapsed} items={sidebarMainNav} onNavigate={onNavigate} title="Học tập" />
      </div>
    </aside>
  );
}

export default StudentSidebar;
