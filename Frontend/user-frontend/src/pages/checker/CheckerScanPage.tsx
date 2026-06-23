import { CheckCircle2, Keyboard, ListChecks, MapPin, ScanLine, ZapOff } from "lucide-react";

function CheckerScanPage() {
  return (
    <div className="min-h-screen bg-slate-800 px-4 py-6 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-48px)] max-w-[420px] flex-col overflow-hidden rounded-[2rem] border border-slate-700 bg-slate-950 shadow-raised">
        <header className="flex items-center justify-between px-5 py-4">
          <button className="rounded-xl bg-white/10 p-3" type="button">
            <ScanLine className="h-5 w-5" />
          </button>
          <h1 className="font-bold">Quét mã điểm danh</h1>
          <button className="rounded-xl bg-white/10 p-3" type="button">
            <ZapOff className="h-5 w-5" />
          </button>
        </header>
        <section className="mx-5 rounded-xl bg-white p-4 text-on-surface shadow-panel">
          <div className="flex items-start justify-between">
            <div>
              <span className="rounded bg-primary px-2 py-1 text-xs font-bold text-on-primary">ĐANG DIỄN RA</span>
              <h2 className="mt-3 text-lg font-bold">Hội thảo Kỹ năng Lãnh đạo Sinh viên</h2>
              <p className="mt-2 flex items-center gap-2 text-sm text-on-surface-variant">
                <MapPin className="h-4 w-4" />
                Hội trường A1
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary">145</p>
              <p className="text-sm">/ 200</p>
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-primary-fixed">
            <div className="h-2 w-[72%] rounded-full bg-primary" />
          </div>
        </section>
        <section className="relative mt-5 flex flex-1 items-center justify-center bg-slate-900">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.12),transparent_55%)]" />
          <div className="relative flex h-56 w-56 items-center justify-center rounded-3xl border-4 border-white/80">
            <ScanLine className="h-14 w-14 text-white/80" />
          </div>
        </section>
        <section className="rounded-t-[2rem] bg-surface px-5 pb-6 pt-5 text-on-surface">
          <div className="mx-auto mb-5 h-1.5 w-16 rounded-full bg-outline-variant" />
          <div className="rounded-xl border border-outline-variant bg-primary-fixed p-4">
            <div className="flex gap-3">
              <CheckCircle2 className="h-7 w-7 text-primary" />
              <div>
                <p className="text-sm font-bold text-primary">Điểm danh thành công</p>
                <h3 className="text-xl font-bold">Nguyễn Văn A</h3>
                <p className="text-sm text-on-surface-variant">MSSV: 20210001 • Lớp: KHMT-01</p>
              </div>
            </div>
          </div>
          <button className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 font-bold text-on-primary" type="button">
            <Keyboard className="h-5 w-5" />
            Nhập MSSV thủ công
          </button>
          <button className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 py-4 font-bold text-on-surface" type="button">
            <ListChecks className="h-5 w-5" />
            Danh sách đã điểm danh
          </button>
        </section>
      </div>
    </div>
  );
}

export default CheckerScanPage;
