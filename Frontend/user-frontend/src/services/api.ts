import { emitToast } from "../utils/toastBus";
import { toSuccessMessage, toUserFacingMessage } from "../utils/messages";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data: unknown = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export type TokenResponse = {
  accessToken: string;
  refreshToken: string;
};

export type LoginPayload = {
  username: string;
  password: string;
};

export type ChangePasswordPayload = {
  username: string;
  oldPassword: string;
  newPassword: string;
};

export type UserProfile = {
  id: string;
  studentId: string;
  fullName: string;
  dob?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  contactPhone?: string;
  studentStatus?: "STUDYING" | "RESERVED" | "SUSPENDED" | "GRADUATED";
  clazz?: {
    id?: string;
    classCode?: string;
    academicYear?: AcademicYearResponse;
    faculty?: {
      id?: string;
      facultyName?: string;
      facultyCode?: string;
    };
  };
};

export type UserProfilePayload = Omit<UserProfile, "id">;

export type StudentImportJobStatus = {
  jobId: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  totalRows: number;
  processedRows: number;
  createdStudents: number;
  updatedStudents: number;
  skippedStudents: number;
  authProcessed: number;
  authTotal: number;
  progressPercent: number;
  message?: string;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
};

export type OrganizationStatus = "ACTIVE" | "INACTIVE";

export type AcademicYearResponse = {
  id: string;
  yearName: string;
  startYear?: number;
  classCount?: number;
};

export type AcademicYearPayload = {
  yearName: string;
  startYear: number;
};

export type FacultyResponse = {
  id: string;
  facultyCode: string;
  facultyName: string;
  status: OrganizationStatus;
  classCount?: number;
  studentCount?: number;
};

export type FacultyPayload = {
  facultyCode: string;
  facultyName: string;
  status: OrganizationStatus;
};

export type ClassResponse = {
  id: string;
  classCode: string;
  faculty?: {
    id: string;
    facultyCode: string;
    facultyName: string;
  };
  academicYear?: AcademicYearResponse;
  status: OrganizationStatus;
  studentCount?: number;
};

export type ClassPayload = {
  classCode: string;
  facultyId: string;
  academicYearId?: string;
  academicYearName?: string;
  startYear?: number;
  status: OrganizationStatus;
};

export type NotificationPriority = "NORMAL" | "URGENT";
export type NotificationTargetType = "ALL" | "FACULTY" | "CLASS" | "USER";
export type NotificationStatus = "DRAFT" | "PUBLISHED" | "EXPIRED" | "REVOKED";

export type NotificationPayload = {
  title: string;
  content: string;
  attachmentUrl?: string;
  priority: NotificationPriority;
  targetType: NotificationTargetType;
  targetId?: string;
  startDate: string;
  endDate: string;
  status: NotificationStatus;
};

export type NotificationResponse = NotificationPayload & {
  id: string;
  createdAt?: string;
  createdBy?: string;
  isRead?: boolean;
};

export type ActivityCategory = "ACADEMIC" | "MOVEMENT" | "FACULTY" | "UNIVERSITY" | "OTHER";
export type ActivityParticipationType = "LIMITED" | "OPEN";
export type ActivityStatus = "UPCOMING" | "ONGOING" | "COMPLETED";

export type ActivityPayload = {
  title: string;
  category: ActivityCategory;
  reward: string;
  participationType: ActivityParticipationType;
  googleFormUrl?: string;
  location: string;
  startTime: string;
  endTime: string;
  capacity?: number;
};

export type ActivityResponse = ActivityPayload & {
  id: string;
  status: ActivityStatus;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  registrationCount?: number;
  attendedCount?: number;
  checkerCount?: number;
};

export type ActivityRegistrationResponse = {
  id: string;
  userTsid: string;
  studentCode: string;
  fullName: string;
  attended: boolean;
  checkinTime?: string;
};

export type ActivityRegistrationPayload = {
  studentCode: string;
  fullName: string;
};

export type ActivityCheckerPayload = {
  checkerCode: string;
  checkerName: string;
};

export type ActivityCheckerResponse = ActivityCheckerPayload & {
  id: string;
  checkerTsid?: string;
};

export type ActivityImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

const getStoredToken = () => sessionStorage.getItem("accessToken") || "";

const isJsonResponse = (res: Response) => res.headers.get("content-type")?.includes("application/json");

type ApiRequestInit = RequestInit & {
  errorMessage?: string;
  successMessage?: string;
  suppressToast?: boolean;
};

async function parseResponse(res: Response) {
  if (res.status === 204) return null;
  if (isJsonResponse(res)) return res.json();
  return res.text();
}

export async function apiRequest<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const { errorMessage, successMessage, suppressToast, ...requestInit } = init;
  const headers = new Headers(requestInit.headers);
  const hasBody = init.body !== undefined;

  if (hasBody && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = getStoredToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...requestInit,
      headers,
    });
  } catch (err) {
    const userMessage = toUserFacingMessage(errorMessage || "Không kết nối được đến hệ thống.");
    if (!suppressToast) {
      emitToast({ variant: "error", message: userMessage });
    }
    throw new ApiError(0, userMessage, err);
  }

  const data = await parseResponse(res);

  if (!res.ok) {
    let message = "Request failed";
    if (typeof data === "object" && data !== null) {
      if ("message" in data) {
        message = String((data as Record<string, unknown>).message);
      } else if ("error" in data) {
        message = String((data as Record<string, unknown>).error);
      } else {
        const errorValues = Object.values(data);
        if (errorValues.length > 0 && typeof errorValues[0] === "string") {
          message = errorValues.join(", ");
        }
      }
    } else if (typeof data === "string") {
      message = data;
    }
    const userMessage = toUserFacingMessage(errorMessage || message);
    if (!suppressToast && res.status !== 401) {
      emitToast({ variant: "error", message: userMessage });
    }
    throw new ApiError(res.status, userMessage, data);
  }

  const method = (requestInit.method || "GET").toUpperCase();
  if (!suppressToast && !["GET", "HEAD", "OPTIONS"].includes(method)) {
    emitToast({ variant: "success", message: toSuccessMessage(successMessage || "Thao tác thành công.") });
  }

  return data as T;
}

export const authApi = {
  login(payload: LoginPayload) {
    return apiRequest<TokenResponse>("/api/auth/login", {
      method: "POST",
      suppressToast: true,
      body: JSON.stringify(payload),
    });
  },
  firstChangePassword(payload: ChangePasswordPayload) {
    return apiRequest<TokenResponse>("/api/auth/first-change-password", {
      method: "POST",
      successMessage: "Đổi mật khẩu thành công.",
      body: JSON.stringify(payload),
    });
  },
  revokeUser(username: string) {
    return apiRequest<string>(`/api/auth/internal/revoke/${encodeURIComponent(username)}`, {
      method: "POST",
    });
  },
  unlockUser(username: string) {
    return apiRequest<string>(`/api/auth/internal/unlock/${encodeURIComponent(username)}`, {
      method: "POST",
    });
  },
  resetPassword(username: string) {
    return apiRequest<string>(`/api/auth/internal/reset-password/${encodeURIComponent(username)}`, {
      method: "POST",
    });
  },
};

export const userApi = {
  list() {
    return apiRequest<UserProfile[]>("/api/users");
  },
  getById(id: string | number) {
    return apiRequest<UserProfile>(`/api/users/${id}`);
  },
  async getByStudentId(studentId: string, options: { suppressToast?: boolean } = {}) {
    const cleanStudentId = studentId.trim();
    if (!cleanStudentId) return null;

    try {
      return await apiRequest<UserProfile>(`/api/users/profile/${encodeURIComponent(cleanStudentId)}`, {
        suppressToast: true,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return null;
      }

      if (options.suppressToast) {
        return null;
      }

      const message = err instanceof Error ? err.message : toUserFacingMessage("Không kiểm tra được thông tin sinh viên.");
      emitToast({ variant: "error", message });
      throw err;
    }
  },
  create(payload: UserProfilePayload) {
    return apiRequest<UserProfile>("/api/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  update(id: string | number, payload: UserProfilePayload) {
    return apiRequest<UserProfile>(`/api/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  remove(id: string | number) {
    return apiRequest<void>(`/api/users/${id}`, {
      method: "DELETE",
    });
  },
  importExcel(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return apiRequest<string>("/api/users/import", {
      method: "POST",
      body: formData,
    });
  },
  startImportJob(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return apiRequest<StudentImportJobStatus>("/api/users/import/jobs", {
      method: "POST",
      body: formData,
      successMessage: "Đã bắt đầu import danh sách sinh viên.",
    });
  },
  getImportJob(jobId: string) {
    return apiRequest<StudentImportJobStatus>(`/api/users/import/jobs/${encodeURIComponent(jobId)}`, {
      suppressToast: true,
    });
  },
  updateMyContact(contactPhone: string) {
    return apiRequest<UserProfile>("/api/users/me/contacts", {
      method: "PATCH",
      body: JSON.stringify({ contactPhone }),
    });
  },
};

export const facultyApi = {
  list() {
    return apiRequest<FacultyResponse[]>("/api/users/faculties");
  },
  importExcel(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return apiRequest<string>("/api/users/faculties/import", {
      method: "POST",
      body: formData,
    });
  },
  create(payload: FacultyPayload) {
    return apiRequest<FacultyResponse>("/api/users/faculties", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  update(id: string | number, payload: FacultyPayload) {
    return apiRequest<FacultyResponse>(`/api/users/faculties/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  remove(id: string | number) {
    return apiRequest<void>(`/api/users/faculties/${id}`, {
      method: "DELETE",
    });
  },
};

export const academicYearApi = {
  list() {
    return apiRequest<AcademicYearResponse[]>("/api/users/academic-years");
  },
  importExcel(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return apiRequest<string>("/api/users/academic-years/import", {
      method: "POST",
      body: formData,
    });
  },
  create(payload: AcademicYearPayload) {
    return apiRequest<AcademicYearResponse>("/api/users/academic-years", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  update(id: string | number, payload: AcademicYearPayload) {
    return apiRequest<AcademicYearResponse>(`/api/users/academic-years/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  remove(id: string | number) {
    return apiRequest<void>(`/api/users/academic-years/${id}`, {
      method: "DELETE",
    });
  },
};

export const classApi = {
  list() {
    return apiRequest<ClassResponse[]>("/api/users/classes");
  },
  importExcel(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return apiRequest<string>("/api/users/classes/import", {
      method: "POST",
      body: formData,
    });
  },
  create(payload: ClassPayload) {
    return apiRequest<ClassResponse>("/api/users/classes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  update(id: string | number, payload: ClassPayload) {
    return apiRequest<ClassResponse>(`/api/users/classes/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  remove(id: string | number) {
    return apiRequest<void>(`/api/users/classes/${id}`, {
      method: "DELETE",
    });
  },
};

export const notificationApi = {
  listAdmin() {
    return apiRequest<NotificationResponse[]>("/api/notifications");
  },
  create(payload: NotificationPayload) {
    return apiRequest<NotificationResponse>("/api/notifications", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  update(id: string, payload: NotificationPayload) {
    return apiRequest<NotificationResponse>(`/api/notifications/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  revoke(id: string) {
    return apiRequest<void>(`/api/notifications/${id}`, {
      method: "DELETE",
    });
  },
  listMine(params: { facultyId?: string; classId?: string } = {}, options: { suppressToast?: boolean } = {}) {
    const search = new URLSearchParams();
    if (params.facultyId) search.set("facultyId", params.facultyId);
    if (params.classId) search.set("classId", params.classId);
    const query = search.toString();
    return apiRequest<NotificationResponse[]>(`/api/notifications/my${query ? `?${query}` : ""}`, {
      suppressToast: options.suppressToast,
    });
  },
  async listMineForProfile(profile: UserProfile | null) {
    const unique = (values: Array<string | undefined>) => Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]));
    const facultyIds = unique([profile?.clazz?.faculty?.id, profile?.clazz?.faculty?.facultyCode, profile?.clazz?.faculty?.facultyName]);
    const classIds = unique([profile?.clazz?.id, profile?.clazz?.classCode]);

    const scopeCandidates: Array<{ facultyId?: string; classId?: string }> = [
      { facultyId: facultyIds[0], classId: classIds[0] },
      ...facultyIds.slice(1).map((facultyId) => ({ facultyId })),
      ...classIds.slice(1).map((classId) => ({ classId })),
    ];
    const scopes = scopeCandidates.filter((scope) => scope.facultyId || scope.classId);

    if (scopes.length === 0) {
      return this.listMine();
    }

    const results = await Promise.all(scopes.map((scope) => this.listMine(scope)));
    return Array.from(new Map(results.flat().map((item) => [item.id, item])).values());
  },
  markAsRead(id: string) {
    return apiRequest<void>(`/api/notifications/${id}/read`, {
      method: "POST",
    });
  },
};

// --- Certification Service Types ---

export type RequestStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "REJECTED" | "NEEDS_INFO" | "CANCELLED";

export type FormType = {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  formCode?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type FormTypePayload = {
  name: string;
  description?: string;
  isActive: boolean;
  formCode?: string;
};

export type ConfirmationRequest = {
  id: string;
  studentId: string;
  formTypeId: string;
  formTypeName: string;
  formCode?: string;
  reason?: string;
  contactPhone?: string;
  proofFileUrl?: string;
  status: RequestStatus;
  adminNote?: string;
  appointmentDate?: string;
  semester?: string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
  studentProfile?: UserProfile;
};

export type CreateConfirmationRequestPayload = {
  formTypeId: string;
  reason?: string;
  contactPhone?: string;
  proofFileUrl?: string;
  semester?: string;
  metadata?: Record<string, unknown>;
};

export type UpdateStatusPayload = {
  status: RequestStatus;
  adminNote?: string;
  appointmentDate?: string;
  metadata?: Record<string, unknown>;
};

export type PageResponse<T> = {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  totalElements: number;
  totalPages: number;
};

// --- Certification Service APIs ---

export const activityApi = {
  list(options: { suppressToast?: boolean } = {}) {
    return apiRequest<ActivityResponse[]>("/api/activities", {
      suppressToast: options.suppressToast,
    });
  },
  listMyCheckerActivities(options: { suppressToast?: boolean } = {}) {
    return apiRequest<ActivityResponse[]>("/api/activities/checker/me", {
      suppressToast: options.suppressToast,
    });
  },
  get(id: string) {
    return apiRequest<ActivityResponse>(`/api/activities/${encodeURIComponent(id)}`);
  },
  create(payload: ActivityPayload) {
    return apiRequest<ActivityResponse>("/api/activities", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  update(id: string, payload: ActivityPayload) {
    return apiRequest<ActivityResponse>(`/api/activities/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  updateStatus(id: string, status: ActivityStatus) {
    return apiRequest<ActivityResponse>(`/api/activities/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
  remove(id: string) {
    return apiRequest<void>(`/api/activities/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
  importRegistrations(id: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return apiRequest<ActivityImportResult>(`/api/activities/${encodeURIComponent(id)}/registrations/import`, {
      method: "POST",
      body: formData,
    });
  },
  listRegistrations(id: string) {
    return apiRequest<ActivityRegistrationResponse[]>(`/api/activities/${encodeURIComponent(id)}/registrations`);
  },
  addRegistration(id: string, payload: ActivityRegistrationPayload) {
    return apiRequest<ActivityRegistrationResponse>(`/api/activities/${encodeURIComponent(id)}/registrations`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  removeRegistration(activityId: string, registrationId: string) {
    return apiRequest<void>(`/api/activities/${encodeURIComponent(activityId)}/registrations/${encodeURIComponent(registrationId)}`, {
      method: "DELETE",
    });
  },
  addChecker(id: string, payload: ActivityCheckerPayload) {
    return apiRequest<ActivityCheckerResponse>(`/api/activities/${encodeURIComponent(id)}/checkers`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  listCheckers(id: string) {
    return apiRequest<ActivityCheckerResponse[]>(`/api/activities/${encodeURIComponent(id)}/checkers`);
  },
  removeChecker(activityId: string, checkerId: string) {
    return apiRequest<void>(`/api/activities/${encodeURIComponent(activityId)}/checkers/${encodeURIComponent(checkerId)}`, {
      method: "DELETE",
    });
  },
  checkin(id: string, studentCode: string, checkerCode: string) {
    return apiRequest<ActivityRegistrationResponse>(`/api/activities/${encodeURIComponent(id)}/checkin`, {
      method: "POST",
      headers: { "X-User-Code": checkerCode },
      body: JSON.stringify({ studentCode }),
    });
  },
};

export const formTypeApi = {
  listAll() {
    return apiRequest<FormType[]>("/api/certifications/form-types");
  },
  getById(id: string) {
    return apiRequest<FormType>(`/api/certifications/form-types/${id}`);
  },
  create(payload: FormTypePayload) {
    return apiRequest<FormType>("/api/certifications/form-types", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  update(id: string, payload: FormTypePayload) {
    return apiRequest<FormType>(`/api/certifications/form-types/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  remove(id: string) {
    return apiRequest<void>(`/api/certifications/form-types/${id}`, {
      method: "DELETE",
    });
  },
};

export const certificationRequestApi = {
  create(payload: CreateConfirmationRequestPayload) {
    return apiRequest<ConfirmationRequest>("/api/certifications/requests", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  listMine() {
    return apiRequest<ConfirmationRequest[]>("/api/certifications/requests/my-requests");
  },
  getMine(id: string) {
    return apiRequest<ConfirmationRequest>(`/api/certifications/requests/my-requests/${id}`);
  },
  cancelMine(id: string) {
    return apiRequest<void>(`/api/certifications/requests/my-requests/${id}/cancel`, {
      method: "PUT",
    });
  },
  listAll(page: number = 0, size: number = 10) {
    return apiRequest<PageResponse<ConfirmationRequest>>(`/api/certifications/requests?page=${page}&size=${size}`);
  },
  getById(id: string) {
    return apiRequest<ConfirmationRequest>(`/api/certifications/requests/${id}`);
  },
  updateStatus(id: string, payload: UpdateStatusPayload) {
    return apiRequest<ConfirmationRequest>(`/api/certifications/requests/${id}/status`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
};

export const fileApi = {
  upload(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return apiRequest<{ fileUrl: string }>("/api/certifications/files/upload", {
      method: "POST",
      body: formData,
    });
  },
};
