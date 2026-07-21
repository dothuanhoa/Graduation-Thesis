import { emitToast } from "../utils/toastBus";
import { toSuccessMessage, toUserFacingMessage } from "../utils/messages";
import { sortBySchoolCode } from "../utils/schoolCodeSort";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const LEGACY_TOKEN_KEY = "token";
const ACCESS_TOKEN_REFRESH_SKEW_MS = 30_000;

type JwtPayload = {
  exp?: number;
};

type AuthSessionHandlers = {
  onAccessTokenChange?: (accessToken: string) => void;
  onSessionExpired?: () => void;
};

let authSessionHandlers: AuthSessionHandlers = {};
let refreshPromise: Promise<string> | null = null;
let memoryAccessToken = "";

export const registerAuthSessionHandlers = (handlers: AuthSessionHandlers) => {
  authSessionHandlers = handlers;

  return () => {
    if (authSessionHandlers === handlers) {
      authSessionHandlers = {};
    }
  };
};

export const getStoredAccessToken = () => memoryAccessToken;

export const setStoredAccessToken = (accessToken: string, notify = true) => {
  memoryAccessToken = accessToken;

  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);

  if (notify) {
    authSessionHandlers.onAccessTokenChange?.(accessToken);
  }
};

export const clearClientAuthTokens = (notify = true) => {
  memoryAccessToken = "";
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);

  if (notify) {
    authSessionHandlers.onSessionExpired?.();
  }
};

const decodeJwtPayload = (token: string): JwtPayload => {
  try {
    const [, payload] = token.split(".");
    if (!payload) return {};
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(normalized)
        .split("")
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(""),
    );
    return JSON.parse(json) as JwtPayload;
  } catch {
    return {};
  }
};

export const isAccessTokenExpired = (token: string, skewMs = ACCESS_TOKEN_REFRESH_SKEW_MS) => {
  const payload = decodeJwtPayload(token);
  if (!payload.exp) return true;
  return payload.exp * 1000 <= Date.now() + skewMs;
};

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
  refreshToken?: string | null;
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

export type ForgotPasswordPayload = {
  usernameOrEmail: string;
};

export type ResetForgotPasswordPayload = {
  token: string;
  newPassword: string;
};

export type CurrentPasswordChangePayload = {
  oldPassword: string;
  newPassword: string;
};

export type UserProfile = {
  id: string;
  studentId: string;
  fullName: string;
  email?: string;
  dob?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  contactPhone?: string;
  studentStatus?: "STUDYING" | "RESERVED" | "SUSPENDED" | "GRADUATED";
  studentGroup?: StudentGroupResponse;
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

export type StudentGroupResponse = {
  id?: number;
  code?: string;
  name?: string;
};

export type BulkStudentUpdateResponse = {
  updatedCount: number;
  message: string;
};

export type StudentGroupScope = "SELECTED_STUDENTS" | "CLASS" | "ACADEMIC_YEAR";

export type BulkStudentGroupPayload = {
  scope: StudentGroupScope;
  studentIds?: Array<string | number>;
  classId?: string | number;
  academicYearId?: string | number;
  studentGroupId: string | number;
};

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
export type NotificationTargetType = "ALL" | "FACULTY" | "CLASS";
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

export type ExamStatus = "ACTIVE" | "INACTIVE";
export type AttemptStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "LOCKED";
export type StudentExamAvailability = "UPCOMING" | "AVAILABLE" | "IN_PROGRESS" | "COMPLETED" | "CLOSED" | "LOCKED";
export type ExamTargetMode = "CLASS" | "STUDENT" | "BOTH";

export type ExamTargetPayload = {
  id?: string | null;
  targetGroupCode: string;
  targetGroupName?: string;
  facultyId?: string;
  facultyCode?: string;
  facultyName?: string;
  classIds?: string[];
  classCodes?: string[];
  targetMode?: ExamTargetMode;
  studentIds?: string[];
  studentCodes?: string[];
  studentNames?: string[];
  startTime: string;
  endTime: string;
};

export type ExamPayload = {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  durationMins: number;
  questionCount: number;
  targetGroupCode: string;
  targets?: ExamTargetPayload[];
  status: ExamStatus;
};

export type ExamResponse = ExamPayload & {
  id: string;
  targetGroupName?: string;
  availableQuestionCount?: number;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type QuestionOptionPayload = {
  content: string;
  correct: boolean;
};

export type QuestionPayload = {
  content: string;
  options: QuestionOptionPayload[];
};

export type QuestionOptionResponse = QuestionOptionPayload & {
  id: string;
};

export type QuestionResponse = {
  id: string;
  examId: string;
  content: string;
  options: QuestionOptionResponse[];
};

export type QuestionImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

export type AttemptResponse = {
  id: string;
  examId: string;
  examTitle: string;
  userTsid: string;
  score?: number;
  correctCount?: number;
  totalQuestions?: number;
  violationCount: number;
  status: AttemptStatus;
  startedAt?: string;
  submittedAt?: string;
  lockedReason?: string;
};

export type StudentExamSummary = {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  durationMins: number;
  questionCount: number;
  targetGroupCode: string;
  targetGroupName?: string;
  eligibleTarget?: ExamTargetPayload;
  availabilityStatus: StudentExamAvailability;
  attemptStatus: AttemptStatus;
  score?: number;
  violationCount: number;
  startedAt?: string;
  submittedAt?: string;
};

export type StudentQuestion = {
  id: string;
  content: string;
  options: Array<{ id: string; content: string }>;
};

export type ExamStateResponse = {
  examId: string;
  attemptId: string;
  status: AttemptStatus;
  startedAt?: string;
  durationMins: number;
  remainingSeconds: number;
  violationCount: number;
  answers: Record<string, string>;
  questions: StudentQuestion[];
};

const isJsonResponse = (res: Response) => res.headers.get("content-type")?.includes("application/json");

type ApiRequestInit = RequestInit & {
  errorMessage?: string;
  successMessage?: string;
  suppressToast?: boolean;
  skipAuthRefresh?: boolean;
};

async function parseResponse(res: Response) {
  if (res.status === 204) return null;
  if (isJsonResponse(res)) return res.json();
  return res.text();
}

const parseJsonString = (value: string) => {
  const cleanValue = value.trim();
  if (!cleanValue || !["{", "["].includes(cleanValue[0])) return null;

  try {
    return JSON.parse(cleanValue) as unknown;
  } catch {
    return null;
  }
};

const extractErrorMessage = (data: unknown): string => {
  if (Array.isArray(data)) {
    const messages = data
      .map((item) => extractErrorMessage(item))
      .filter((message) => message && message !== "Request failed");
    return messages[0] || "Request failed";
  }

  if (typeof data === "object" && data !== null) {
    if ("message" in data) {
      const message = (data as Record<string, unknown>).message;
      return typeof message === "string" ? message : extractErrorMessage(message);
    }
    if ("error" in data) {
      const error = (data as Record<string, unknown>).error;
      return typeof error === "string" ? error : extractErrorMessage(error);
    }
    const errorValues = Object.values(data);
    if (errorValues.length > 0 && typeof errorValues[0] === "string") {
      return errorValues.join(", ");
    }
    if (errorValues.length > 0) {
      return extractErrorMessage(errorValues[0]);
    }
  }

  if (typeof data === "string") {
    const parsed = parseJsonString(data);
    if (parsed !== null) {
      return extractErrorMessage(parsed);
    }
    return data;
  }

  return "Request failed";
};

async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      clearClientAuthTokens();
      throw new ApiError(0, toUserFacingMessage("Không thể làm mới phiên đăng nhập."), err);
    }

    const data = await parseResponse(res);
    if (!res.ok) {
      clearClientAuthTokens();
      throw new ApiError(res.status, toUserFacingMessage(extractErrorMessage(data)), data);
    }

    const tokenResponse = data as TokenResponse;
    if (!tokenResponse.accessToken) {
      clearClientAuthTokens();
      throw new ApiError(401, toUserFacingMessage("Phiên đăng nhập đã hết hạn."), data);
    }

    setStoredAccessToken(tokenResponse.accessToken);
    return tokenResponse.accessToken;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function getValidAccessToken(skipAuthRefresh: boolean) {
  const token = getStoredAccessToken();
  if (skipAuthRefresh) {
    return token;
  }

  if (token && !isAccessTokenExpired(token)) {
    return token;
  }

  return refreshAccessToken();
}

const buildRequestHeaders = (headersInit: HeadersInit | undefined, body: BodyInit | null | undefined, token: string) => {
  const headers = new Headers(headersInit);
  const hasBody = body !== undefined && body !== null;

  if (hasBody && !(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
};

export async function apiRequest<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const { errorMessage, successMessage, suppressToast, skipAuthRefresh = false, ...requestInit } = init;
  const credentials = requestInit.credentials ?? "include";
  let token: string;

  try {
    token = await getValidAccessToken(skipAuthRefresh);
  } catch (err) {
    if (!suppressToast && !(err instanceof ApiError && err.status === 401)) {
      emitToast({
        variant: "error",
        message: err instanceof Error ? err.message : toUserFacingMessage("Phiên đăng nhập đã hết hạn."),
      });
    }
    throw err;
  }

  let headers = buildRequestHeaders(requestInit.headers, requestInit.body, token);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...requestInit,
      headers,
      credentials,
    });
  } catch (err) {
    const userMessage = toUserFacingMessage(errorMessage || "Không kết nối được đến hệ thống.");
    if (!suppressToast) {
      emitToast({ variant: "error", message: userMessage });
    }
    throw new ApiError(0, userMessage, err);
  }

  if (res.status === 401 && !skipAuthRefresh) {
    try {
      token = await refreshAccessToken();
      headers = buildRequestHeaders(requestInit.headers, requestInit.body, token);
      res = await fetch(`${API_BASE_URL}${path}`, {
        ...requestInit,
        headers,
        credentials,
      });
    } catch (err) {
      if (!suppressToast && !(err instanceof ApiError && err.status === 401)) {
        emitToast({
          variant: "error",
          message: err instanceof Error ? err.message : toUserFacingMessage("Phiên đăng nhập đã hết hạn."),
        });
      }
      throw err;
    }
  }

  const data = await parseResponse(res);

  if (!res.ok) {
    const message = extractErrorMessage(data);
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

export async function apiBlobRequest(path: string, init: ApiRequestInit = {}): Promise<Blob> {
  const { errorMessage, successMessage, suppressToast, skipAuthRefresh = false, ...requestInit } = init;
  const credentials = requestInit.credentials ?? "include";
  let token: string;

  try {
    token = await getValidAccessToken(skipAuthRefresh);
  } catch (err) {
    if (!suppressToast && !(err instanceof ApiError && err.status === 401)) {
      emitToast({
        variant: "error",
        message: err instanceof Error ? err.message : toUserFacingMessage("Phiên đăng nhập đã hết hạn."),
      });
    }
    throw err;
  }

  let headers = buildRequestHeaders(requestInit.headers, requestInit.body, token);
  let res: Response;

  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...requestInit,
      headers,
      credentials,
    });
  } catch (err) {
    const userMessage = toUserFacingMessage(errorMessage || "Không kết nối được đến hệ thống.");
    if (!suppressToast) {
      emitToast({ variant: "error", message: userMessage });
    }
    throw new ApiError(0, userMessage, err);
  }

  if (res.status === 401 && !skipAuthRefresh) {
    try {
      token = await refreshAccessToken();
      headers = buildRequestHeaders(requestInit.headers, requestInit.body, token);
      res = await fetch(`${API_BASE_URL}${path}`, {
        ...requestInit,
        headers,
        credentials,
      });
    } catch (err) {
      if (!suppressToast && !(err instanceof ApiError && err.status === 401)) {
        emitToast({
          variant: "error",
          message: err instanceof Error ? err.message : toUserFacingMessage("Phiên đăng nhập đã hết hạn."),
        });
      }
      throw err;
    }
  }

  if (!res.ok) {
    const data = await parseResponse(res);
    const message = extractErrorMessage(data);
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

  return res.blob();
}

export const authApi = {
  login(payload: LoginPayload) {
    return apiRequest<TokenResponse>("/api/auth/login", {
      method: "POST",
      suppressToast: true,
      skipAuthRefresh: true,
      body: JSON.stringify(payload),
    });
  },
  firstChangePassword(payload: ChangePasswordPayload) {
    return apiRequest<TokenResponse>("/api/auth/first-change-password", {
      method: "POST",
      successMessage: "Đổi mật khẩu thành công.",
      skipAuthRefresh: true,
      body: JSON.stringify(payload),
    });
  },
  forgotPassword(payload: ForgotPasswordPayload) {
    return apiRequest<{ message: string }>("/api/auth/forgot-password", {
      method: "POST",
      suppressToast: true,
      skipAuthRefresh: true,
      body: JSON.stringify(payload),
    });
  },
  resetForgotPassword(payload: ResetForgotPasswordPayload) {
    return apiRequest<{ message: string }>("/api/auth/reset-password", {
      method: "POST",
      suppressToast: true,
      skipAuthRefresh: true,
      body: JSON.stringify(payload),
    });
  },
  changePassword(payload: CurrentPasswordChangePayload) {
    return apiRequest<{ message: string }>("/api/auth/change-password", {
      method: "POST",
      suppressToast: true,
      body: JSON.stringify(payload),
    });
  },
  refresh() {
    return apiRequest<TokenResponse>("/api/auth/refresh", {
      method: "POST",
      suppressToast: true,
      skipAuthRefresh: true,
    });
  },
  logout() {
    return apiRequest<void>("/api/auth/logout", {
      method: "POST",
      suppressToast: true,
      skipAuthRefresh: true,
    });
  },
  revokeUser(username: string) {
    return apiRequest<string>(`/api/auth/admin/revoke/${encodeURIComponent(username)}`, {
      method: "POST",
    });
  },
  unlockUser(username: string) {
    return apiRequest<string>(`/api/auth/admin/unlock/${encodeURIComponent(username)}`, {
      method: "POST",
    });
  },
  resetPassword(username: string) {
    return apiRequest<string>(`/api/auth/admin/reset-password/${encodeURIComponent(username)}`, {
      method: "POST",
    });
  },
};

export const userApi = {
  list() {
    return apiRequest<UserProfile[]>("/api/users").then((profiles) => sortBySchoolCode(profiles, (profile) => profile.studentId));
  },
  getById(id: string | number) {
    return apiRequest<UserProfile>(`/api/users/${id}`);
  },
  listStudentGroups() {
    return apiRequest<StudentGroupResponse[]>("/api/users/student-groups").then((groups) => sortBySchoolCode(groups, (group) => group.code));
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
  create(payload: UserProfilePayload, options: { sendMail?: boolean } = {}) {
    const searchParams = new URLSearchParams({ sendMail: String(options.sendMail ?? true) });
    return apiRequest<UserProfile>(`/api/users?${searchParams.toString()}`, {
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
  removeMany(studentIds: Array<string | number>) {
    return apiRequest<BulkStudentUpdateResponse>("/api/users/bulk/delete", {
      method: "POST",
      body: JSON.stringify({ studentIds }),
    });
  },
  assignStudentsToClass(studentIds: Array<string | number>, classId: string | number) {
    return apiRequest<BulkStudentUpdateResponse>("/api/users/bulk/class", {
      method: "PATCH",
      body: JSON.stringify({
        studentIds,
        classId,
      }),
    });
  },
  updateStudentStatuses(studentIds: Array<string | number>, status: NonNullable<UserProfile["studentStatus"]>) {
    return apiRequest<BulkStudentUpdateResponse>("/api/users/bulk/status", {
      method: "PATCH",
      body: JSON.stringify({
        studentIds,
        status,
      }),
    });
  },
  updateStudentGroups(payload: BulkStudentGroupPayload) {
    return apiRequest<BulkStudentUpdateResponse>("/api/users/bulk/group", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  downloadImportTemplate() {
    return apiBlobRequest("/api/users/import/template", {
      suppressToast: true,
    });
  },
  importExcel(file: File, options: { sendMail?: boolean } = {}) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("sendMail", String(options.sendMail ?? true));
    return apiRequest<string>("/api/users/import", {
      method: "POST",
      body: formData,
    });
  },
  startImportJob(file: File, options: { sendMail?: boolean } = {}) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("sendMail", String(options.sendMail ?? true));
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
    return apiRequest<FacultyResponse[]>("/api/users/faculties").then((faculties) => sortBySchoolCode(faculties, (faculty) => faculty.facultyCode));
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
    return apiRequest<AcademicYearResponse[]>("/api/users/academic-years").then((years) => sortBySchoolCode(years, (year) => year.yearName));
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
    return apiRequest<ClassResponse[]>("/api/users/classes").then((classes) => sortBySchoolCode(classes, (clazz) => clazz.classCode));
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
    void profile;
    return this.listMine();
  },
  markAsRead(id: string) {
    return apiRequest<void>(`/api/notifications/${id}/read`, {
      method: "POST",
      suppressToast: true,
    });
  },
};

export const notificationImageApi = {
  upload(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return apiRequest<{ location: string; fileUrl: string }>("/api/notifications/images/upload", {
      method: "POST",
      body: formData,
      suppressToast: true,
      errorMessage: "Khong tai duoc anh thong bao.",
    });
  },
};
// --- Certification Service Types ---

export type RequestStatus = "PENDING" | "PROCESSING" | "PRINTED" | "COMPLETED" | "REJECTED" | "NEEDS_INFO" | "CANCELLED";

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

export type BulkUpdateStatusPayload = {
  requestIds: string[];
  status?: RequestStatus;
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
  downloadRegistrationImportTemplate() {
    return apiBlobRequest("/api/activities/registrations/import/template", {
      suppressToast: true,
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

export const examApi = {
  list() {
    return apiRequest<ExamResponse[]>("/api/exams");
  },
  get(id: string) {
    return apiRequest<ExamResponse>(`/api/exams/${encodeURIComponent(id)}`);
  },
  create(payload: ExamPayload) {
    return apiRequest<ExamResponse>("/api/exams", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  update(id: string, payload: ExamPayload) {
    return apiRequest<ExamResponse>(`/api/exams/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  updateStatus(id: string, status: ExamStatus) {
    return apiRequest<ExamResponse>(`/api/exams/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
  remove(id: string) {
    return apiRequest<void>(`/api/exams/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
  listQuestions(examId: string) {
    return apiRequest<QuestionResponse[]>(`/api/exams/${encodeURIComponent(examId)}/questions`);
  },
  createQuestion(examId: string, payload: QuestionPayload) {
    return apiRequest<QuestionResponse>(`/api/exams/${encodeURIComponent(examId)}/questions`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateQuestion(examId: string, questionId: string, payload: QuestionPayload) {
    return apiRequest<QuestionResponse>(`/api/exams/${encodeURIComponent(examId)}/questions/${encodeURIComponent(questionId)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  removeQuestion(examId: string, questionId: string) {
    return apiRequest<void>(`/api/exams/${encodeURIComponent(examId)}/questions/${encodeURIComponent(questionId)}`, {
      method: "DELETE",
    });
  },
  importQuestions(examId: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return apiRequest<QuestionImportResult>(`/api/exams/${encodeURIComponent(examId)}/questions/import`, {
      method: "POST",
      body: formData,
    });
  },
  listAttempts(examId?: string) {
    const path = examId ? `/api/exams/${encodeURIComponent(examId)}/attempts` : "/api/exams/attempts";
    return apiRequest<AttemptResponse[]>(path);
  },
  listMine() {
    return apiRequest<StudentExamSummary[]>("/api/exams/my");
  },
  start(id: string) {
    return apiRequest<ExamStateResponse>(`/api/exams/${encodeURIComponent(id)}/start`, {
      method: "POST",
      suppressToast: true,
    });
  },
  getState(id: string) {
    return apiRequest<ExamStateResponse>(`/api/exams/${encodeURIComponent(id)}/state`, {
      suppressToast: true,
    });
  },
  saveAnswer(id: string, questionId: string, optionId: string) {
    return apiRequest<ExamStateResponse>(`/api/exams/${encodeURIComponent(id)}/answers`, {
      method: "PUT",
      suppressToast: true,
      body: JSON.stringify({ questionId, optionId }),
    });
  },
  recordViolation(id: string) {
    return apiRequest<ExamStateResponse>(`/api/exams/${encodeURIComponent(id)}/violations`, {
      method: "POST",
      suppressToast: true,
    });
  },
  submit(id: string) {
    return apiRequest<ExamStateResponse>(`/api/exams/${encodeURIComponent(id)}/submit`, {
      method: "POST",
    });
  },
  result(id: string) {
    return apiRequest<AttemptResponse>(`/api/exams/${encodeURIComponent(id)}/result`);
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
  updateMineProof(id: string, proofFileUrl: string) {
    return apiRequest<ConfirmationRequest>(`/api/certifications/requests/my-requests/${id}/proof`, {
      method: "PUT",
      body: JSON.stringify({ proofFileUrl }),
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
  bulkUpdateStatus(payload: BulkUpdateStatusPayload) {
    return apiRequest<ConfirmationRequest[]>("/api/certifications/requests/bulk/status", {
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
