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
  id: number;
  studentId: string;
  fullName: string;
  dob?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  contactPhone?: string;
  studentStatus?: "STUDYING" | "RESERVED" | "SUSPENDED" | "GRADUATED";
  clazz?: {
    id?: number;
    classCode?: string;
    faculty?: {
      facultyName?: string;
      facultyCode?: string;
    };
  };
};

export type UserProfilePayload = Omit<UserProfile, "id">;

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

const getStoredToken = () => localStorage.getItem("accessToken") || localStorage.getItem("token") || "";

const isJsonResponse = (res: Response) => res.headers.get("content-type")?.includes("application/json");

async function parseResponse(res: Response) {
  if (res.status === 204) return null;
  if (isJsonResponse(res)) return res.json();
  return res.text();
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const hasBody = init.body !== undefined;

  if (hasBody && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = getStoredToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  const data = await parseResponse(res);

  if (!res.ok) {
    let message = "Request failed";
    if (typeof data === "object" && data !== null) {
      if ("message" in data) {
        message = String((data as any).message);
      } else if ("error" in data) {
        message = String((data as any).error);
      } else {
        const errorValues = Object.values(data);
        if (errorValues.length > 0 && typeof errorValues[0] === "string") {
          message = errorValues.join(", ");
        }
      }
    } else if (typeof data === "string") {
      message = data;
    }
    throw new ApiError(res.status, message, data);
  }

  return data as T;
}

export const authApi = {
  login(payload: LoginPayload) {
    return apiRequest<TokenResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  firstChangePassword(payload: ChangePasswordPayload) {
    return apiRequest<TokenResponse>("/api/auth/first-change-password", {
      method: "POST",
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
  getById(id: number) {
    return apiRequest<UserProfile>(`/api/users/${id}`);
  },
  async getByStudentId(studentId: string) {
    const profiles = await apiRequest<UserProfile[]>("/api/users");
    return profiles.find((profile) => profile.studentId?.toLowerCase() === studentId.toLowerCase()) ?? null;
  },
  create(payload: UserProfilePayload) {
    return apiRequest<UserProfile>("/api/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  update(id: number, payload: UserProfilePayload) {
    return apiRequest<UserProfile>(`/api/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  remove(id: number) {
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
  updateMyContact(contactPhone: string) {
    return apiRequest<UserProfile>("/api/users/me/contacts", {
      method: "PATCH",
      body: JSON.stringify({ contactPhone }),
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
  listMine(params: { facultyId?: string; classId?: string } = {}) {
    const search = new URLSearchParams();
    if (params.facultyId) search.set("facultyId", params.facultyId);
    if (params.classId) search.set("classId", params.classId);
    const query = search.toString();
    return apiRequest<NotificationResponse[]>(`/api/notifications/my${query ? `?${query}` : ""}`);
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
  metadata?: Record<string, any>;
  studentProfile?: UserProfile;
};

export type CreateConfirmationRequestPayload = {
  formTypeId: string;
  reason?: string;
  contactPhone?: string;
  proofFileUrl?: string;
  semester?: string;
  metadata?: Record<string, any>;
};

export type UpdateStatusPayload = {
  status: RequestStatus;
  adminNote?: string;
  appointmentDate?: string;
  metadata?: Record<string, any>;
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

