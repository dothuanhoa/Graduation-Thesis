import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";

type RouteErrorBoundaryProps = {
  children: ReactNode;
};

type RouteErrorBoundaryState = {
  hasError: boolean;
};

class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Route render error", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center text-on-background">
          <div className="max-w-md rounded-lg border border-outline-variant bg-surface-container-lowest p-6 shadow-panel">
            <p className="text-sm font-bold text-primary">Không tải được màn hình</p>
            <h1 className="mt-2 text-2xl font-bold text-on-surface">Vui lòng tải lại trang</h1>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">Trình duyệt có thể đang giữ phiên bản cũ của file giao diện.</p>
            <Link className="mt-5 inline-flex rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary" to="/login">
              Về đăng nhập
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RouteErrorBoundary;
