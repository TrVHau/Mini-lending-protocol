import { NavLink } from "react-router-dom";

function Navbar() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      "flex items-center rounded px-4 py-3 text-sm font-medium",
      isActive
        ? "bg-slate-800 text-slate-50"
        : "text-slate-400 hover:bg-slate-800 hover:text-slate-50",
    ].join(" ");

  const actionClass =
    "flex items-center rounded border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-50";

  return (
    <aside className="sticky top-0 z-50 flex h-screen w-full flex-col border-b border-slate-800 bg-slate-950 md:fixed md:left-0 md:top-0 md:w-72 md:border-b-0 md:border-r">
      <div className="flex h-full flex-col gap-6 px-4 py-4">
        <div className="flex items-center gap-3 pb-2">
          <div className="flex h-11 w-11 items-center justify-center rounded border border-slate-700 bg-slate-900 text-sm font-bold text-slate-100">
            <img src="../public/favicon.png" alt="" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Mini Lending Protocol
            </p>
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          <NavLink to="/dashboard" className={linkClass} end>
            Dashboard
          </NavLink>
          <button type="button" className={actionClass}>
            Activity
          </button>
        </nav>

        <div className="flex flex-col gap-3 rounded border border-slate-800 bg-slate-900 p-4">
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            Explore
          </span>
          <button type="button" className={actionClass}>
            Deposit
          </button>
          <button type="button" className={actionClass}>
            Borrow
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Navbar;
