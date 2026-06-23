import type { ComponentType } from "react";

type StatCardProps = {
  label: string;
  value: string;
  trend: string;
  icon: ComponentType<{ className?: string }>;
  tone?: string;
};

const toneClass: Record<string, string> = {
  primary: "bg-primary-fixed text-primary",
  info: "bg-surface-container-high text-primary",
  warning: "bg-orange-100 text-orange-800",
  success: "bg-emerald-100 text-emerald-700",
};

function StatCard({ label, value, trend, icon: Icon, tone = "primary" }: StatCardProps) {
  return (
    <article className="panel p-5 transition hover:shadow-raised">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${toneClass[tone]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <span className="rounded-lg bg-primary-fixed px-2.5 py-1 text-xs font-semibold text-primary">{trend}</span>
      </div>
      <p className="text-sm text-on-surface-variant">{label}</p>
      <p className="mt-1 text-3xl font-bold text-on-surface">{value}</p>
    </article>
  );
}

export default StatCard;
