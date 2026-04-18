import AccountSummary from "../components/AccountSummary";
import MarketTable from "../components/MarketTable";

function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-100">
      <AccountSummary />
      <MarketTable />
    </div>
  );
}

export default Dashboard;
