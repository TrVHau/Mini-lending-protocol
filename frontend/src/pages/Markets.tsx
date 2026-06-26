import Navbar from "../components/Navbar";
import MarketTable from "../components/MarketTable";

function Markets() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <Navbar />
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
            Markets
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-50">
            Available reserves
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Compare supply rates, borrow costs, liquidity, and risk parameters
            across every initialized asset.
          </p>
        </div>
        <MarketTable />
      </main>
    </div>
  );
}

export default Markets;
