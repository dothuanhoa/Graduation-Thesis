import { Award, ShieldAlert } from "lucide-react";
import Card from "../../../components/Card";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import type { StudentRecord } from "../../../data/studentPortalData";

type StudentRecordsPageProps = {
  title: string;
  subtitle: string;
  records: StudentRecord[];
  variant: "reward" | "discipline";
};

function StudentRecordsPage({ title, subtitle, records, variant }: StudentRecordsPageProps) {
  const Icon = variant === "reward" ? Award : ShieldAlert;

  return (
    <div className="space-y-gutter">
      <PageHeader title={title} subtitle={subtitle} />
      <div className="grid gap-gutter">
        {records.map((record) => (
          <Card key={record.id}>
            <div className="grid gap-5 md:grid-cols-[auto_1fr_auto] md:items-center">
              <div className="rounded-lg bg-primary-fixed p-3 text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-on-surface">{record.title}</h2>
                <p className="mt-2 text-sm text-on-surface-variant">
                  {record.source} · {record.date}
                </p>
                <p className="mt-2 text-sm text-on-surface-variant">{record.note}</p>
              </div>
              <StatusBadge status={record.status} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default StudentRecordsPage;
