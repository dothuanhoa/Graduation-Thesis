import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import RouteErrorBoundary from "../components/RouteErrorBoundary";
import { useAuth } from "../context/useAuth";
import AdminLayout from "../layouts/AdminLayout";
import AuthLayout from "../layouts/AuthLayout";
import StudentLayout from "../layouts/StudentLayout";
import ActivityCreatePage from "../pages/admin/activity/ActivityCreatePage";
import ActivityDetailPage from "../pages/admin/activity/ActivityDetailPage";
import AdminActivitiesPage from "../pages/admin/activity/AdminActivitiesPage";
import AdminDashboard from "../pages/admin/dashboard/AdminDashboard";
import AdminExamDetailPage from "../pages/admin/exam/AdminExamDetailPage";
import AdminExamResultsPage from "../pages/admin/exam/AdminExamResultsPage";
import AdminExamsPage from "../pages/admin/exam/AdminExamsPage";
import AdminQuestionsPage from "../pages/admin/exam/AdminQuestionsPage";
import AdminModulePage from "../pages/admin/shared/AdminModulePage";
import AdminCertificatesPage from "../pages/admin/certificate/AdminCertificatesPage";
import AdminCertificateDetailPage from "../pages/admin/certificate/AdminCertificateDetailPage";
import AdminFormTypesPage from "../pages/admin/certificate/AdminFormTypesPage";
import AdminNotificationsPage from "../pages/admin/notification/AdminNotificationsPage";
import NotificationCreatePage from "../pages/admin/notification/NotificationCreatePage";
import NotificationEditPage from "../pages/admin/notification/NotificationEditPage";
import AcademicYearManagementPage from "../pages/admin/organization/AcademicYearManagementPage";
import ClassManagementPage from "../pages/admin/organization/ClassManagementPage";
import FacultyManagementPage from "../pages/admin/organization/FacultyManagementPage";
import StudentCreatePage from "../pages/admin/user/StudentCreatePage";
import StudentDetailPage from "../pages/admin/user/StudentDetailPage";
import StudentImportPage from "../pages/admin/user/StudentImportPage";
import StudentListPage from "../pages/admin/user/StudentListPage";
import CheckerScanPage from "../pages/checker/CheckerScanPage";
import ForbiddenPage from "../pages/ForbiddenPage";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import LoginPage from "../pages/auth/LoginPage";
import NotFoundPage from "../pages/NotFoundPage";
import ResetPasswordPage from "../pages/auth/ResetPasswordPage";
import StudentActivitiesPage from "../pages/student/activity/StudentActivitiesPage";
import StudentActivityDetailPage from "../pages/student/activity/StudentActivityDetailPage";
import StudentCertificateRequestPage from "../pages/student/certificate/StudentCertificateRequestPage";
import StudentCertificatesPage from "../pages/student/certificate/StudentCertificatesPage";
import ExamResultPage from "../pages/student/exam/ExamResultPage";
import StudentExamsPage from "../pages/student/exam/StudentExamsPage";
import ExamTakePage from "../pages/student/exam/ExamTakePage";
import StudentDashboard from "../pages/student/dashboard/StudentDashboard";
import StudentModulePage from "../pages/student/shared/StudentModulePage";
import StudentNotificationDetailPage from "../pages/student/notification/StudentNotificationDetailPage";
import StudentNotificationsPage from "../pages/student/notification/StudentNotificationsPage";
import StudentProfilePage from "../pages/student/profile/StudentProfilePage";
import {
  adminModuleMeta,
  certificates,
  studentModuleMeta,
} from "../data/mockData";
import { getDashboardPath, isAdminRole } from "../utils/authRouting";

function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center text-sm font-semibold text-on-surface-variant">
      Đang kiểm tra phiên đăng nhập...
    </div>
  );
}

function GuestOnlyRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing, role } = useAuth();

  if (isInitializing) {
    return <AuthLoading />;
  }

  if (isAuthenticated) {
    return <Navigate to={getDashboardPath(role)} replace />;
  }

  return children;
}

function RequireRole({
  children,
  adminOnly = false,
}: {
  children: ReactNode;
  adminOnly?: boolean;
}) {
  const { isAuthenticated, isInitializing, role } = useAuth();

  if (isInitializing) {
    return <AuthLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdminRole(role)) {
    return <Navigate to="/403" replace />;
  }

  return children;
}

function RootRedirect() {
  const { isAuthenticated, isInitializing, role } = useAuth();
  if (isInitializing) {
    return <AuthLoading />;
  }

  return (
    <Navigate
      to={isAuthenticated ? getDashboardPath(role) : "/login"}
      replace
    />
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={
            <GuestOnlyRoute>
              <LoginPage />
            </GuestOnlyRoute>
          }
        />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route
        element={
          <RequireRole adminOnly>
            <AdminLayout />
          </RequireRole>
        }
      >
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route
          path="/admin/statistics"
          element={<AdminModulePage meta={adminModuleMeta.statistics} />}
        />
        <Route path="/admin/faculties" element={<FacultyManagementPage />} />
        <Route
          path="/admin/academic-years"
          element={<AcademicYearManagementPage />}
        />
        <Route path="/admin/classes" element={<ClassManagementPage />} />
        <Route path="/admin/students" element={<StudentListPage />} />
        <Route path="/admin/students/new" element={<StudentCreatePage />} />
        <Route path="/admin/students/import" element={<StudentImportPage />} />
        <Route path="/admin/students/:id" element={<StudentDetailPage />} />
        <Route
          path="/admin/notifications"
          element={<AdminNotificationsPage />}
        />
        <Route
          path="/admin/notifications/new"
          element={<NotificationCreatePage />}
        />
        <Route
          path="/admin/notifications/:id/edit"
          element={<NotificationEditPage />}
        />
        <Route
          path="/admin/exams"
          element={<AdminExamsPage />}
        />
        <Route
          path="/admin/exams/:id"
          element={<AdminExamDetailPage />}
        />
        <Route
          path="/admin/questions"
          element={<AdminQuestionsPage />}
        />
        <Route
          path="/admin/exam-results"
          element={<AdminExamResultsPage />}
        />
        <Route path="/admin/activities" element={<AdminActivitiesPage />} />
        <Route path="/admin/activities/new" element={<ActivityCreatePage />} />
        <Route path="/admin/activities/:id" element={<ActivityDetailPage />} />
        <Route
          path="/admin/attendance"
          element={<AdminModulePage meta={adminModuleMeta.attendance} />}
        />
        <Route
          path="/admin/activity-summary"
          element={<AdminModulePage meta={adminModuleMeta.activitySummary} />}
        />
        <Route path="/admin/certificates" element={<AdminCertificatesPage />} />
        <Route
          path="/admin/certificates/handover"
          element={<AdminModulePage meta={adminModuleMeta.handover} />}
        />
        <Route
          path="/admin/certificates/:id"
          element={<AdminCertificateDetailPage />}
        />
        <Route path="/admin/form-types" element={<AdminFormTypesPage />} />
        <Route
          path="/admin/appointments"
          element={
            <AdminModulePage
              meta={adminModuleMeta.appointments}
              dataset={certificates}
            />
          }
        />
        <Route
          path="/admin/reports/students"
          element={<AdminModulePage meta={adminModuleMeta.reportsStudents} />}
        />
        <Route
          path="/admin/reports/exams"
          element={<AdminModulePage meta={adminModuleMeta.reportsExams} />}
        />
        <Route
          path="/admin/reports/activities"
          element={<AdminModulePage meta={adminModuleMeta.reportsActivities} />}
        />
      </Route>

      <Route
        element={
          <RequireRole>
            <StudentLayout />
          </RequireRole>
        }
      >
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/profile" element={<StudentProfilePage />} />
        <Route
          path="/student/notifications"
          element={<StudentNotificationsPage />}
        />
        <Route
          path="/student/notifications/:id"
          element={<StudentNotificationDetailPage />}
        />
        <Route path="/student/exams" element={<StudentExamsPage />} />
        <Route
          path="/student/exams/:id/instruction"
          element={
            <StudentModulePage meta={studentModuleMeta.examInstruction} />
          }
        />
        <Route path="/student/exams/:id/take" element={<ExamTakePage />} />
        <Route
          path="/student/exams/:id/result"
          element={<ExamResultPage />}
        />
        <Route path="/student/activities" element={<StudentActivitiesPage />} />
        <Route
          path="/student/activities/:id"
          element={<StudentActivityDetailPage />}
        />
        <Route
          path="/student/certificates"
          element={<StudentCertificatesPage />}
        />
        <Route
          path="/student/certificates/new"
          element={<StudentCertificateRequestPage />}
        />
      </Route>

      <Route
        path="/checker/scan"
        element={
          <RequireRole>
            <CheckerScanPage />
          </RequireRole>
        }
      />
      <Route
        path="/403"
        element={
          <RequireRole>
            <RouteErrorBoundary>
              <ForbiddenPage />
            </RouteErrorBoundary>
          </RequireRole>
        }
      />
      <Route path="/" element={<RootRedirect />} />
      <Route
        path="*"
        element={
          <RequireRole>
            <RouteErrorBoundary>
              <NotFoundPage />
            </RouteErrorBoundary>
          </RequireRole>
        }
      />
    </Routes>
  );
}

export default AppRoutes;
