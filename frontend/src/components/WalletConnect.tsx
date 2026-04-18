import { useConnection, useConnect, useDisconnect, useConnectors } from "wagmi";

function WalletConnect() {
  const { address, isConnected } = useConnection();
  const { mutate: disconnect } = useDisconnect();
  const { mutate: connect, isPending, error } = useConnect();

  const connectors = useConnectors();

  // Trạng thái: Đã kết nối
  if (isConnected) {
    return (
      <div className="flex items-center h-12 w-60">
        <div className="flex items-center gap-2 px-2">
          <span className="text-sm font-medium text-gray-700">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
        </div>
        <button
          onClick={() => disconnect()}
          className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // Trạng thái: Chưa kết nối
  return (
    <div className="relative flex items-center gap-2 h-12 w-60">
      {connectors.map((c) => (
        <button
          key={c.uid}
          onClick={() => connect({ connector: c })}
          disabled={isPending}
          className="ml-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors shadow-sm"
        >
          {isPending ? "Connecting..." : `Connect ${c.name}`}
        </button>
      ))}
      {error && (
        <div className="absolute top-full mt-1 px-2 py-1 text-xs text-red-600 bg-red-100 z-10 shadow-sm">
          {error.message}
        </div>
      )}
    </div>
  );
}
export default WalletConnect;
