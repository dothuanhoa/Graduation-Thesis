import { CalendarDays, MapPin, TicketCheck } from "lucide-react";
import Card from "../../../components/Card";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import { studentActivities } from "../../../data/studentPortalData";

function StudentActivitiesPage() {
  return (
    <div className="space-y-gutter">
      <PageHeader
        title="Hoạt động ngoại khóa"
        subtitle="Đăng ký hoạt động, theo dõi số chỗ còn lại, địa điểm và điểm rèn luyện dự kiến."
      />

      <div className="grid gap-gutter lg:grid-cols-3">
        {studentActivities.map((activity) => (
          <Card key={activity.id} className="overflow-hidden p-0">
            <div className="bg-surface-container-low p-5">
              <div className="mb-8 flex items-start justify-between gap-4">
                <span className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-on-primary">{activity.reward}</span>
                <StatusBadge status={activity.status} />
              </div>
              <h2 className="text-xl font-bold text-on-surface">{activity.title}</h2>
            </div>
            <div className="space-y-3 p-5 text-sm text-on-surface-variant">
              <p className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                {activity.date} · {activity.time}
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                {activity.location}
              </p>
              <p className="flex items-center gap-2">
                <TicketCheck className="h-4 w-4 text-primary" />
                {activity.seat}
              </p>
              <button className="mt-4 w-full rounded-lg border border-primary px-4 py-3 font-semibold text-primary hover:bg-surface-container-low" type="button">
                Đăng ký hoạt động
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default StudentActivitiesPage;
