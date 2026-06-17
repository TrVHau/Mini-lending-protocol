import { useAccount, useConnect, useDisconnect } from "wagmi";

function WalletConnect() {
  const { address, isConnected } = useAccount();
  const disconnect = useDisconnect();
  const connect = useConnect();

  if (isConnected) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-2 py-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-300" />
          <span className="truncate font-mono text-xs text-slate-300">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
        </div>
        <button
          onClick={() => disconnect.mutate({})}
          className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {connect.connectors.map((connector) => (
        <button
          key={connector.uid}
          onClick={() => connect.mutate({ connector })}
          disabled={connect.isPending}
          className="rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-300 disabled:opacity-50"
        >
          {connect.isPending ? "Connecting..." : `Connect ${connector.name}`}
        </button>
      ))}
      {connect.error && (
        <p className="basis-full text-center text-[11px] text-red-300">
          Could not connect. Please try again.
        </p>
      )}
    </div>
  );
}

export default WalletConnect;
