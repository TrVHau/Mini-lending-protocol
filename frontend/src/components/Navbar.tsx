import { NavLink } from "react-router-dom";
import WalletConnect from "./WalletConnect";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/markets", label: "Markets" },
  { to: "/faucet", label: "Faucet" },
  { to: "/liquidation", label: "Liquidation" },
];

function Navbar() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      "rounded-full px-3 py-2 text-sm font-medium transition-colors",
      isActive
        ? "bg-cyan-300/10 text-cyan-200"
        : "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
    ].join(" ");

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <NavLink to="/dashboard" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-sm font-bold text-cyan-100">
              ML
            </span>
            <span>
              <span className="block text-sm font-bold uppercase tracking-widest text-slate-100">
                Mini Lending
              </span>
              <span className="block text-[11px] text-slate-500">
                On-chain money market
              </span>
            </span>
          </NavLink>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:flex-1">
          <nav className="flex flex-wrap gap-1 lg:justify-center">
            {NAV_ITEMS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={linkClass}
                end={to === "/dashboard"}
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="sm:min-w-52">
            <WalletConnect />
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
