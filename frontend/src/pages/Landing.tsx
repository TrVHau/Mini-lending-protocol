import { Link } from "react-router-dom";

function Landing() {
  return (
    <main className="flex min-h-screen items-center px-6 py-16">
      <section className="mx-auto flex flex-col gap-10">
        <div>
          <p className="mb-4 text-sm text-slate-500">Mini Lending Protocol</p>
          <h1 className="text-4xl font-semibold text-slate-50">
            Mini lending protocol dashboard.
          </h1>
          <p className="mt-6 text-base text-slate-400">
            Track markets, manage positions, and borrow or deposit assets in a
            simple interface.
          </p>
          <div className="mt-8 flex gap-3">
            <Link
              to="/dashboard"
              className="rounded border border-slate-700 bg-slate-100 px-6 py-3 text-sm font-medium text-slate-950 hover:bg-white"
            >
              Enter Dashboard
            </Link>
          </div>
        </div>

        <div className="rounded border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <span className="text-sm text-slate-300">Protocol</span>
            <span className="text-xs text-slate-500">Live</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="rounded border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs text-slate-500">TVL</p>
              <p className="mt-3 text-2xl font-semibold text-slate-50">
                $1.23M
              </p>
            </div>
            <div className="rounded border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs text-slate-500">Users</p>
              <p className="mt-3 text-2xl font-semibold text-slate-50">456</p>
            </div>
            <div className="rounded border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs text-slate-500">Borrow APY</p>
              <p className="mt-3 text-2xl font-semibold text-slate-50">2.5%</p>
            </div>
            <div className="rounded border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs text-slate-500">Assets</p>
              <p className="mt-3 text-2xl font-semibold text-slate-50">2</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
export default Landing;
