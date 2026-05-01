import WalletConnect from "../components/WalletConnect";
import MarketTable from "../components/MarketTable";
import Navbar from "../components/Navbar";

function Dashboard() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 md:pl-72">
      <Navbar />
      <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <WalletConnect />
        <MarketTable />
      </main>
    </div>
  );
}

export default Dashboard;
