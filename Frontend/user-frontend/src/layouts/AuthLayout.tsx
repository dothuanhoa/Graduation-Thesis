import { Outlet } from "react-router-dom";

function AuthLayout() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/background.jpg')" }}
      />
      <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]" />
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <Outlet />
      </main>
    </div>
  );
}

export default AuthLayout;
