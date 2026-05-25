// wagmi v3 — useConnect trả về object với .mutate(), .connectors, .isPending, .error
// useDisconnect trả về object với .mutate()
import { useAccount, useConnect, useDisconnect } from "wagmi";

function WalletConnect() {
  const { address, isConnected } = useAccount();
  const disconnect = useDisconnect();
  const connect = useConnect();

  if (isConnected) {
    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs text-emerald-400">
            ●
          </span>
          <span className="truncate font-mono text-xs text-slate-300">
            {address?.slice(0, 6)}…{address?.slice(-4)}
          </span>
        </div>
        <button
          onClick={() => disconnect.mutate({})}
          className="shrink-0 rounded-lg bg-red-900/30 px-2.5 py-1 text-xs font-semibold text-red-400 hover:bg-red-900/50 transition-colors"
        >
          Ngắt
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {connect.connectors.map((c) => (
        <button
          key={c.uid}
          onClick={() => connect.mutate({ connector: c })}
          disabled={connect.isPending}
          className="w-full rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {connect.isPending ? "Đang kết nối…" : `Kết nối ${c.name}`}
        </button>
      ))}
      {connect.error && (
        <p className="text-[10px] text-red-400 text-center">
          Không thể kết nối. Vui lòng thử lại.
        </p>
      )}
    </div>
  );
}

export default WalletConnect;
