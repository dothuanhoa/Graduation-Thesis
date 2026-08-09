import { ChevronDown, PanelLeft } from "lucide-react";
import { useState, type ComponentType } from "react";
import { Link } from "react-router-dom";

type HeaderAccountAction = {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  onClick?: () => void;
};

type HeaderProps = {
  userName?: string;
  roleLabel?: string;
  initials?: string;
  mobileTitle?: string;
  accountActions?: HeaderAccountAction[];
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
};

function Header({
  userName = "Quản trị viên",
  roleLabel = "Chuyên viên CTSV",
  initials = "AD",
  mobileTitle = "Quản lý CTSV",
  accountActions = [],
  isSidebarCollapsed = false,
  onToggleSidebar,
}: HeaderProps) {
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-outline-variant bg-surface-bright px-4 shadow-sm md:px-padding-page">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {onToggleSidebar && (
          <button
            aria-label={isSidebarCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
            className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-outline-variant text-primary transition hover:bg-surface-container"
            onClick={onToggleSidebar}
            type="button"
          >
            <PanelLeft className={`h-5 w-5 transition ${isSidebarCollapsed ? "rotate-180" : ""}`} />
          </button>
        )}

        <div className="flex min-w-0 items-center gap-3">
          {!onToggleSidebar && <img alt="STU" className="h-9 w-9 rounded-lg object-contain" src="/Logo_STU.png" />}
          <span className="truncate text-sm font-bold uppercase tracking-wide text-primary md:text-base md:normal-case md:tracking-normal">
            {mobileTitle}
          </span>
        </div>
      </div>

      <div className="relative flex items-center">
        <button
          aria-expanded={isAccountOpen}
          aria-haspopup="menu"
          className="flex items-center gap-3 rounded-full p-1 pr-2 transition hover:bg-surface-container md:pr-3"
          onClick={() => setIsAccountOpen((current) => !current)}
          type="button"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary">
            {initials}
          </div>
          <div className="hidden text-left md:block">
            <p className="font-semibold text-on-surface">{userName}</p>
            <p className="text-xs text-on-surface-variant">{roleLabel}</p>
          </div>
          {accountActions.length > 0 && (
            <ChevronDown className={`h-4 w-4 text-on-surface-variant transition ${isAccountOpen ? "rotate-180" : ""}`} />
          )}
        </button>

        {accountActions.length > 0 && isAccountOpen && (
          <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest py-2 shadow-raised" role="menu">
            {accountActions.map((action) => {
              const Icon = action.icon;
              if (action.onClick) {
                return (
                  <button
                    key={action.path}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                    onClick={() => {
                      action.onClick?.();
                      setIsAccountOpen(false);
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <Icon className="h-5 w-5" />
                    {action.label}
                  </button>
                );
              }

              return (
                <Link
                  key={action.path}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                  onClick={() => setIsAccountOpen(false)}
                  role="menuitem"
                  to={action.path}
                >
                  <Icon className="h-5 w-5" />
                  {action.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
