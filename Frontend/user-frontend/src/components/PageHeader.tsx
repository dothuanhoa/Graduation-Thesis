import { Plus } from "lucide-react";

type PageHeaderProps = {
  title: string;
  subtitle: string;
  actionLabel?: string;
};

function PageHeader({ title, subtitle, actionLabel }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-primary">{subtitle.split(".")[0]}</p>
        <h1 className="text-3xl font-bold text-on-surface md:text-4xl">{title}</h1>
        <p className="mt-2 max-w-3xl text-base text-on-surface-variant">{subtitle}</p>
      </div>
      {actionLabel && (
        <button
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary shadow-panel transition hover:bg-primary-container"
          type="button"
        >
          <Plus className="h-5 w-5" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default PageHeader;
