import { NavLink } from "react-router-dom";
import { studentMainNav, studentSecondaryNav, type StudentNavItem } from "../data/studentPortalData";

type StudentSidebarProps = {
  studentName?: string;
  studentCode?: string;
};

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
    isActive
      ? "bg-primary text-on-primary shadow-panel"
      : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
  }`;

function NavGroup({ title, items }: { title: string; items: StudentNavItem[] }) {
  return (
    <div className="space-y-2">
      <p className="px-3 text-xs font-bold uppercase text-outline">{title}</p>
      <nav className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.path} className={linkClass} to={item.path}>
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

function StudentSidebar({ studentName = "Sinh viên", studentCode = "" }: StudentSidebarProps) {
  const sidebarMainNav = studentMainNav.filter((item) => item.path !== "/student/profile");

  return (
    <aside className="hidden h-screen w-[282px] flex-shrink-0 flex-col border-r border-outline-variant bg-surface-container-lowest px-4 py-6 md:flex">
      <div className="mb-7 flex items-center gap-3 px-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-fixed">
          <img alt="STU" className="h-9 w-9 object-contain" src="/Logo_STU.png" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-primary">Cổng sinh viên</p>
          <p className="truncate text-xs font-semibold text-on-surface-variant">Phòng Công tác sinh viên</p>
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-outline-variant bg-surface-container-low p-4">
        <p className="truncate text-sm font-bold text-on-surface">{studentName}</p>
        <p className="mt-1 text-xs font-semibold text-primary">{studentCode || "Tài khoản sinh viên"}</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pr-1">
        <NavGroup items={sidebarMainNav} title="Học tập" />
        <NavGroup items={studentSecondaryNav} title="Theo dõi" />
      </div>
    </aside>
  );
}

export default StudentSidebar;
