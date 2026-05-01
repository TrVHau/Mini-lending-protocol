import { useConnection } from "wagmi";

function AccountSummary() {
  const { address, isConnected } = useConnection();

  if (!isConnected) {
    return (
      <div className="flex items-center gap-2 px-2">
        <span className="text-sm font-medium text-slate-300">
          Not connected
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-2">
      <span className="text-sm font-medium text-slate-300">
        {address?.slice(0, 6)}...{address?.slice(-4)}
      </span>
    </div>
  );
}

export default AccountSummary;
