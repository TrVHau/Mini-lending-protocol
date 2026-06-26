import { useConnection as useAccount } from "wagmi";
import { useUserAccountData } from "../hooks";

const WAD = 1e18;
const MAX_UINT =
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

function formatUsd(wad: bigint) {
  return (Number(wad) / WAD).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function healthFactorValue(hf: bigint): number | null {
  if (hf === BigInt(MAX_UINT)) return null;
  return Number(hf) / WAD;
}

function HealthIndicator({ hf }: { hf?: bigint }) {
  if (!hf) {
    return (
      <div>
        <p className="text-2xl font-semibold text-slate-500">--</p>
        <div className="mt-3 h-1.5 rounded-full bg-slate-800" />
      </div>
    );
  }

  const value = healthFactorValue(hf);
  const label = value === null ? "Max" : value.toFixed(2);
  const width = value === null ? 100 : Math.max(8, Math.min(value * 33, 100));
  const color =
    value === null || value >= 2
      ? "bg-emerald-300"
      : value >= 1.2
        ? "bg-amber-300"
        : "bg-red-300";
  const text =
    value === null || value >= 2
      ? "text-emerald-300"
      : value >= 1.2
        ? "text-amber-300"
        : "text-red-300";

  return (
    <div>
      <p className={`text-2xl font-semibold ${text}`}>{label}</p>
      <div className="mt-3 h-1.5 rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function AccountSummary() {
  const { address, isConnected } = useAccount();
  const { accountData } = useUserAccountData(address);

  if (!isConnected) {
    return (
      <section className="rounded-lg border border-slate-800 bg-slate-950/80 px-6 py-7">
        <p className="text-sm font-medium text-slate-300">
          Connect your wallet to view your portfolio.
        </p>
      </section>
    );
  }

  const collateral = accountData?.collateralUsdWad ?? 0n;
  const debt = accountData?.debtUsdWad ?? 0n;
  const maxBorrow = accountData?.maxBorrowUsdWad ?? 0n;
  const netWorth = collateral > debt ? collateral - debt : 0n;
  const availableToBorrow = maxBorrow > debt ? maxBorrow - debt : 0n;

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/80">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 px-6 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
            Portfolio
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-50">
            {accountData ? formatUsd(netWorth) : "--"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Net worth</p>
        </div>
        <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 font-mono text-xs text-slate-300">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
      </div>

      <div className="grid gap-px bg-slate-800 md:grid-cols-4">
        <div className="bg-slate-950/80 p-5">
          <p className="text-xs font-medium text-slate-500">Supplied</p>
          <p className="mt-2 text-lg font-semibold text-slate-50">
            {accountData ? formatUsd(accountData.collateralUsdWad) : "--"}
          </p>
        </div>
        <div className="bg-slate-950/80 p-5">
          <p className="text-xs font-medium text-slate-500">Borrowed</p>
          <p className="mt-2 text-lg font-semibold text-slate-50">
            {accountData ? formatUsd(accountData.debtUsdWad) : "--"}
          </p>
        </div>
        <div className="bg-slate-950/80 p-5">
          <p className="text-xs font-medium text-slate-500">
            Available to borrow
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-50">
            {accountData ? formatUsd(availableToBorrow) : "--"}
          </p>
        </div>
        <div className="bg-slate-950/80 p-5">
          <p className="text-xs font-medium text-slate-500">Health factor</p>
          <HealthIndicator hf={accountData?.healthFactorWad} />
        </div>
      </div>
    </section>
  );
}

export default AccountSummary;
