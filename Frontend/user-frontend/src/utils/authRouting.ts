export const isAdminRole = (role?: string) => (role || "").toUpperCase().includes("ADMIN");

export const getDashboardPath = (role?: string) => (isAdminRole(role) ? "/admin/dashboard" : "/student/dashboard");
