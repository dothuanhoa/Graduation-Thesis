import ErrorStatePage from "../components/ErrorStatePage";
import { useAuth } from "../context/useAuth";
import { getDashboardPath } from "../utils/authRouting";

function ForbiddenPage() {
  const { isAuthenticated, role } = useAuth();
  const backPath = isAuthenticated ? getDashboardPath(role) : "/login";

  return (
    <ErrorStatePage
      backPath={backPath}
      code="403"
      description="Tài khoản hiện tại không được phép mở màn hình này. Bạn có thể quay về dashboard phù hợp với quyền đang đăng nhập."
      title="Bạn không có quyền truy cập"
      variant="forbidden"
    />
  );
}

export default ForbiddenPage;
