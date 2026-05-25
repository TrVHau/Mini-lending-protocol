import Navbar from "../components/Navbar";
import MarketTable from "../components/MarketTable";

function Markets() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 md:pl-72">
      <Navbar />
      <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="mb-4 text-2xl font-semibold">Markets</h1>
        <MarketTable />
      </main>
    </div>
  );
}

export default Markets;
