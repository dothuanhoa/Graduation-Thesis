export type NotificationCategory =
  | "GENERAL"
  | "CONDUCT_SCORE"
  | "STUDENT_AFFAIRS"
  | "ACADEMIC"
  | "SCHOLARSHIP"
  | "EVENT";

export type NotificationItem = {
  id: number;
  title: string;
  content: string;
  category: NotificationCategory;
  location?: string;
  actionUrl?: string;
  pinned: boolean;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  startAt?: string;
  endAt?: string;
  deadlineAt?: string;
};

export type NotificationFormData = Omit<
  NotificationItem,
  "id" | "createdAt" | "updatedAt"
>;
