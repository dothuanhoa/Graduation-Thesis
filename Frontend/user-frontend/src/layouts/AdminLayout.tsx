import { Outlet } from "react-router-dom";
import Footer from "../components/Footer";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { adminNav, adminUtilityNav } from "../data/mockData";

function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-background text-on-background">
      <Sidebar items={adminNav} utilityItems={adminUtilityNav} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 px-4 py-6 md:px-padding-page md:py-padding-page">
          <div className="mx-auto flex max-w-container-max flex-col gap-gutter">
            <Outlet />
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
