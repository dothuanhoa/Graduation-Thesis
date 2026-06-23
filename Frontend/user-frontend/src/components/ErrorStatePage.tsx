import { ArrowLeft, Home, LockKeyhole, SearchX } from "lucide-react";
import { Link } from "react-router-dom";

type ErrorStatePageProps = {
  code: "403" | "404";
  title: string;
  description: string;
  backPath: string;
  variant: "forbidden" | "not-found";
};

function FloatingTile({ className, delay = "0s" }: { className: string; delay?: string }) {
  return <div className={`absolute rounded-lg border border-white/50 bg-white/75 shadow-panel backdrop-blur ${className}`} style={{ animation: `tile-float 4s ${delay} ease-in-out infinite` }} />;
}

function ErrorScene({ code, variant }: { code: ErrorStatePageProps["code"]; variant: ErrorStatePageProps["variant"] }) {
  const isForbidden = variant === "forbidden";
  const Icon = isForbidden ? LockKeyhole : SearchX;

  return (
    <div className="relative mx-auto h-[330px] w-full max-w-md [perspective:1100px]">
      <FloatingTile className="left-4 top-8 h-16 w-16" />
      <FloatingTile className="right-7 top-14 h-12 w-24" delay=".35s" />
      <FloatingTile className="bottom-10 left-10 h-10 w-28" delay=".7s" />

      <div className="absolute left-1/2 top-1/2 w-[270px] -translate-x-1/2 -translate-y-1/2 [animation:error-card_5s_ease-in-out_infinite] [transform-style:preserve-3d]">
        <div className="relative rounded-lg border border-outline-variant bg-surface-container-lowest p-6 shadow-raised">
          <div className="absolute inset-0 translate-x-5 translate-y-5 rounded-lg bg-primary/20 blur-sm [transform:translateZ(-52px)]" />
          <div className="relative">
            <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-lg ${isForbidden ? "bg-error-container text-error" : "bg-primary-fixed text-primary"}`}>
              <Icon className="h-10 w-10" />
            </div>
            <div className="mt-5 flex justify-center gap-2 text-6xl font-black">
              {code.split("").map((digit, index) => (
                <span
                  className="inline-block rounded-lg bg-primary px-3 py-2 text-on-primary shadow-panel"
                  key={`${digit}-${index}`}
                  style={{ animation: `digit-bounce 2.2s ${index * 0.15}s ease-in-out infinite` }}
                >
                  {digit}
                </span>
              ))}
            </div>
            <p className="mt-5 text-center text-sm font-semibold text-on-surface-variant">
              {isForbidden ? "Quyền truy cập bị chặn" : "Đường dẫn không tồn tại"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorStatePage({ backPath, code, description, title, variant }: ErrorStatePageProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-8 text-on-background">
      <style>
        {`
          @keyframes tile-float {
            0%, 100% { transform: translateY(0) rotateX(0deg) rotateY(0deg); }
            50% { transform: translateY(-14px) rotateX(10deg) rotateY(-12deg); }
          }
          @keyframes error-card {
            0%, 100% { transform: translate(-50%, -50%) rotateX(8deg) rotateY(-16deg); }
            50% { transform: translate(-50%, calc(-50% - 10px)) rotateX(16deg) rotateY(12deg); }
          }
          @keyframes digit-bounce {
            0%, 100% { transform: translateY(0) rotateZ(0deg); }
            50% { transform: translateY(-8px) rotateZ(3deg); }
          }
        `}
      </style>
      <div className="absolute inset-x-0 top-0 h-48 bg-primary-fixed/50" />
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <section className="grid w-full items-center gap-8 rounded-lg border border-outline-variant bg-surface-container-lowest/95 p-6 shadow-raised backdrop-blur md:grid-cols-[1fr_1fr] md:p-10">
          <ErrorScene code={code} variant={variant} />

          <div className="text-center md:text-left">
            <p className="text-sm font-bold uppercase text-primary">Lỗi {code}</p>
            <h1 className="mt-3 text-3xl font-bold text-on-surface md:text-5xl">{title}</h1>
            <p className="mt-4 text-base leading-7 text-on-surface-variant">{description}</p>

            <div className="mt-7 flex flex-wrap justify-center gap-3 md:justify-start">
              <Link className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary shadow-panel" to={backPath}>
                <Home className="h-5 w-5" />
                Về dashboard
              </Link>
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-3 font-semibold text-primary hover:bg-surface-container"
                onClick={() => window.history.back()}
                type="button"
              >
                <ArrowLeft className="h-5 w-5" />
                Quay lại
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default ErrorStatePage;
