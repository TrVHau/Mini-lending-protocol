import { useConnection } from "wagmi";

function AccountSummary() {
  const { address, isConnected } = useConnection();

  if (!isConnected) {
    return <div className="text-gray-500">Not connected</div>;
  }

  return (
    <div className="flex items-center gap-2 px-2">
      <span className="text-sm font-medium text-gray-700">
        {address?.slice(0, 6)}...{address?.slice(-4)}
      </span>
    </div>
  );
}

export default AccountSummary;
