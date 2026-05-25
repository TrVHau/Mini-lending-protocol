import { NavLink } from "react-router-dom";
import WalletConnect from "./WalletConnect";

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: "⊞" },
  { to: "/markets", label: "Markets", icon: "◈" },
  { to: "/position", label: "Vị thế của tôi", icon: "◉" },
  { to: "/liquidation", label: "Thanh lý", icon: "⚡" },
];

function Navbar() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
      isActive
        ? "bg-slate-800 text-slate-50 shadow-inner"
        : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200",
    ].join(" ");

  return (
    <aside className="sticky top-0 z-50 flex w-full flex-col border-b border-slate-800 bg-slate-950 md:fixed md:left-0 md:top-0 md:h-screen md:w-72 md:border-b-0 md:border-r">
      <div className="flex h-full flex-col gap-4 overflow-y-auto px-4 py-5">
        {/* Logo */}
        <div className="mb-1 flex items-center gap-3 px-1 pb-3 border-b border-slate-800">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-linear-to-br from-blue-600 to-purple-700 text-sm font-bold text-white shadow-lg">
            M
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-200">
              Mini Lending
            </p>
            <p className="text-[10px] text-slate-500">Protocol v0.1</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1">
          <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
            Điều hướng
          </p>
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={linkClass}
              end={to === "/dashboard"}
            >
              <span className="text-base leading-none">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Wallet */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Ví
          </p>
          <WalletConnect />
        </div>
      </div>
    </aside>
  );
}

export default Navbar;
