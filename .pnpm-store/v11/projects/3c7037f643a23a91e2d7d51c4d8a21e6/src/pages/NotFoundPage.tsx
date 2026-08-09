import ErrorStatePage from "../components/ErrorStatePage";
import { useAuth } from "../context/useAuth";
import { getDashboardPath } from "../utils/authRouting";

function NotFoundPage() {
  const { isAuthenticated, role } = useAuth();
  const backPath = isAuthenticated ? getDashboardPath(role) : "/login";

  return (
    <ErrorStatePage
      backPath={backPath}
      code="404"
      description="Route này chưa được cấu hình trong bộ giao diện CTSV. Kiểm tra lại đường dẫn hoặc quay về dashboard để tiếp tục."
      title="Không tìm thấy màn hình"
      variant="not-found"
    />
  );
}

export default NotFoundPage;
