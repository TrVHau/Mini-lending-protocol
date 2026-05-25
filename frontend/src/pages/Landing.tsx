import { Link } from "react-router-dom";
import { useMarketOverview } from "../hooks";

// APY helpers removed — rates not available from getReserveData

function Landing() {
  const { reserves, reserveDataByAsset, isLoading } = useMarketOverview();

  // Tính TVL tổng (USD WAD)
  // Không có USD trực tiếp từ hook này, nên tính từ totalDeposits * price
  // Tạm thời hiển thị số lượng assets và tổng deposits

  const assetCount = reserves.length;

  // APY rates are not currently available from getReserveData; leave as null
  // APY not available from getReserveData; show placeholder

  const STATS = [
    {
      label: "Số Assets",
      value: isLoading ? "…" : assetCount.toString(),
      icon: "◈",
    },
    {
      label: "Avg Supply APY",
      value: isLoading ? "…" : "0%",
      icon: "↑",
    },
    {
      label: "Avg Borrow APY",
      value: isLoading ? "…" : "0%",
      icon: "↓",
    },
    {
      label: "Reserves Active",
      value: isLoading
        ? "…"
        : reserves
            .filter((a) => reserveDataByAsset?.[a]?.isActive)
            .length.toString(),
      icon: "✓",
    },
  ];

  return (
    <main className="flex min-h-screen items-center bg-slate-950 px-6 py-16">
      <section className="mx-auto w-full max-w-3xl flex flex-col gap-10">
        {/* Hero */}
        <div>
          <span className="inline-block rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400 border border-blue-500/20 mb-4">
            Mini Lending Protocol
          </span>
          <h1 className="text-5xl font-bold text-slate-50 leading-tight">
            Lend & Borrow <br />
            <span className="bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              on-chain
            </span>
          </h1>
          <p className="mt-5 text-base text-slate-400 max-w-lg">
            Giao thức cho vay phi tập trung. Nạp tài sản để nhận lãi, hoặc vay
            có thế chấp với lãi suất biến động.
          </p>
          <div className="mt-8 flex gap-3">
            <Link
              to="/dashboard"
              className="rounded-xl bg-blue-600 px-7 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
            >
              Vào Dashboard →
            </Link>
            <Link
              to="/markets"
              className="rounded-xl border border-slate-700 bg-slate-900 px-7 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-slate-50 transition-colors"
            >
              Xem Markets
            </Link>
          </div>
        </div>

        {/* Stats card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
          <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-4">
            <span className="text-sm font-semibold text-slate-300">
              Thống kê Protocol
            </span>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live on-chain
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {STATS.map(({ label, value, icon }) => (
              <div
                key={label}
                className="rounded-xl border border-slate-800 bg-slate-950 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-500">{label}</p>
                  <span className="text-slate-600 text-xs">{icon}</span>
                </div>
                <p className="text-2xl font-bold text-slate-50">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            {
              icon: "🔒",
              title: "Có thế chấp",
              desc: "Vay dựa trên tài sản đảm bảo",
            },
            {
              icon: "⚡",
              title: "Lãi suất động",
              desc: "Tự điều chỉnh theo cung cầu",
            },
            {
              icon: "🛡",
              title: "Health Factor",
              desc: "Bảo vệ khỏi bị thanh lý",
            },
          ].map(({ icon, title, desc }) => (
            <div
              key={title}
              className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
            >
              <div className="text-2xl mb-2">{icon}</div>
              <p className="text-xs font-semibold text-slate-200">{title}</p>
              <p className="mt-1 text-xs text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default Landing;
