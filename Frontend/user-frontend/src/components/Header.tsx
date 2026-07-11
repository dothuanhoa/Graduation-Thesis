import { Bell, ChevronDown, CircleHelp, PanelLeft, Search } from "lucide-react";
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
  searchPlaceholder?: string;
  accountActions?: HeaderAccountAction[];
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
};

function Header({
  userName = "Nguyễn Văn A",
  roleLabel = "Chuyên viên CTSV",
  initials = "NA",
  mobileTitle = "Quản lý CTSV",
  searchPlaceholder = "Tìm kiếm sinh viên, đơn từ, thông báo...",
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

        <div className="relative hidden w-full max-w-xl md:block">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant" />
          <input
            className="w-full rounded-full border border-outline-variant bg-surface-container-low py-2 pl-10 pr-4 text-sm focus-ring"
            placeholder={searchPlaceholder}
            type="search"
          />
        </div>

        <div className="flex min-w-0 items-center gap-3 md:hidden">
          {!onToggleSidebar && <img alt="STU" className="h-9 w-9 rounded-lg object-contain" src="/Logo_STU.png" />}
          <span className="truncate font-bold text-primary">{mobileTitle}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button aria-label="Thông báo" className="relative rounded-full p-2 text-on-surface-variant hover:bg-surface-container" type="button">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error" />
        </button>
        <button aria-label="Trợ giúp" className="hidden rounded-full p-2 text-on-surface-variant hover:bg-surface-container md:inline-flex" type="button">
          <CircleHelp className="h-5 w-5" />
        </button>
        <div className="hidden h-6 w-px bg-outline-variant md:block" />
        <div className="relative">
          <button
            aria-expanded={isAccountOpen}
            aria-haspopup="menu"
            className="flex items-center gap-3 rounded-full p-1 pr-3 hover:bg-surface-container"
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
            {accountActions.length > 0 && <ChevronDown className={`h-4 w-4 text-on-surface-variant transition ${isAccountOpen ? "rotate-180" : ""}`} />}
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
                    onClick={() => {
                      action.onClick?.();
                      setIsAccountOpen(false);
                    }}
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
      </div>
    </header>
  );
}

export default Header;
