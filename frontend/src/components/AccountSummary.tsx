import { useAccount } from "wagmi";
import { useUserAccountData } from "../hooks";

const WAD = 1e18;

function formatUsd(wad: bigint) {
  return (Number(wad) / WAD).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function HealthBadge({ hf }: { hf: bigint }) {
  const val = Number(hf) / WAD;
  const isMax = hf === BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
  const label = isMax ? "∞" : val.toFixed(2);
  const color = isMax || val >= 2 ? "text-emerald-400" : val >= 1.2 ? "text-yellow-400" : "text-red-400";
  return <span className={`font-semibold ${color}`}>{label}</span>;
}

function AccountSummary() {
  const { address, isConnected } = useAccount();
  const { accountData } = useUserAccountData(address);

  if (!isConnected) {
    return (
      <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 px-6 py-4">
        <p className="text-sm text-slate-500">Kết nối ví để xem thông tin tài khoản</p>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 px-6 py-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Tài khoản</p>
        <span className="rounded-full bg-slate-800 px-3 py-0.5 font-mono text-xs text-slate-300">
          {address?.slice(0, 6)}…{address?.slice(-4)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
          <p className="text-xs text-slate-500">Collateral</p>
          <p className="mt-1 text-base font-semibold text-slate-50">
            {accountData ? formatUsd(accountData.collateralUsdWad) : "--"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
          <p className="text-xs text-slate-500">Nợ hiện tại</p>
          <p className="mt-1 text-base font-semibold text-slate-50">
            {accountData ? formatUsd(accountData.debtUsdWad) : "--"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
          <p className="text-xs text-slate-500">Có thể vay thêm</p>
          <p className="mt-1 text-base font-semibold text-slate-50">
            {accountData ? formatUsd(accountData.maxBorrowUsdWad) : "--"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
          <p className="text-xs text-slate-500">Health Factor</p>
          <p className="mt-1 text-base">
            {accountData ? <HealthBadge hf={accountData.healthFactorWad} /> : "--"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default AccountSummary;
