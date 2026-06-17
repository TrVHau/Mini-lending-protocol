import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAccount } from "wagmi";
import ActionModal, { type ActionType } from "../components/ActionModal";
import Navbar from "../components/Navbar";
import {
  useMarketOverview,
  useReserveData,
  useTokenBalance,
  useUserReserveData,
} from "../hooks";

const WAD = 1e18;

function formatUsd(wad: bigint) {
  return (Number(wad) / WAD).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function formatToken(amount: bigint | null | undefined, decimals: number) {
  if (amount === null || amount === undefined) return "--";
  const value = Number(amount) / 10 ** decimals;
  return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function formatApy(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return "--";
  return `${value.toFixed(value < 0.01 && value > 0 ? 4 : 2)}%`;
}

function formatBps(value: bigint | undefined) {
  if (value === undefined) return "--";
  return `${(Number(value) / 100).toFixed(0)}%`;
}

function StatCard({
  label,
  value,
  sub,
  accent = "text-slate-50",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${accent}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function AssetDetail() {
  const { address: assetAddress } = useParams<{ address: string }>();
  const { address: userAddress } = useAccount();
  const [modal, setModal] = useState<ActionType | null>(null);

  const asset = /^0x[0-9a-fA-F]{40}$/.test(assetAddress ?? "")
    ? (assetAddress as `0x${string}`)
    : undefined;

  const { reserveData, isLoading } = useReserveData(asset);
  const { userReserveData } = useUserReserveData(userAddress, asset);
  const { balance: walletBalance } = useTokenBalance(userAddress, asset);
  const { tokenMetaByAsset, marketStatsByAsset } = useMarketOverview();

  if (!asset) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-10 text-center text-slate-500 sm:px-6 lg:px-8">
          Invalid asset address.{" "}
          <Link to="/markets" className="text-cyan-300 hover:underline">
            Back to Markets
          </Link>
        </main>
      </div>
    );
  }

  const meta = tokenMetaByAsset?.[asset];
  const stats = marketStatsByAsset?.[asset];
  const symbol = meta?.symbol ?? asset.slice(2, 6).toUpperCase();
  const name = meta?.name ?? `${asset.slice(0, 8)}...${asset.slice(-4)}`;
  const decimals = Number(reserveData?.assetDecimals ?? 18);
  const totalDeposits = stats?.totalDeposits;
  const totalBorrowed = stats?.totalBorrowed;
  const utilization =
    totalDeposits !== undefined &&
    totalDeposits > 0n &&
    totalBorrowed !== undefined
      ? (Number(totalBorrowed) / Number(totalDeposits)) * 100
      : 0;

  const actionButtons: {
    action: ActionType;
    label: string;
    color: string;
    disabled?: boolean;
  }[] = [
    {
      action: "deposit",
      label: "Supply",
      color: "bg-emerald-400 text-slate-950 hover:bg-emerald-300",
    },
    {
      action: "withdraw",
      label: "Withdraw",
      color: "bg-slate-800 text-slate-100 hover:bg-slate-700",
      disabled: !userReserveData || userReserveData.collateralAmount === 0n,
    },
    {
      action: "borrow",
      label: "Borrow",
      color: "bg-cyan-400 text-slate-950 hover:bg-cyan-300",
    },
    {
      action: "repay",
      label: "Repay",
      color: "bg-slate-800 text-slate-100 hover:bg-slate-700",
      disabled: !userReserveData || userReserveData.debtAmount === 0n,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <Navbar />
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Link
          to="/markets"
          className="mb-5 inline-flex text-xs font-medium text-slate-500 transition-colors hover:text-cyan-300"
        >
          Back to Markets
        </Link>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 text-lg font-bold text-cyan-100">
              {symbol.slice(0, 3)}
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-slate-50">{name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-900 px-2.5 py-1 font-mono text-xs text-slate-400">
                  {symbol}
                </span>
                <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs text-slate-400">
                  {reserveData?.isActive ? "Active" : "Inactive"}
                </span>
                {reserveData?.isFrozen && (
                  <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-xs text-amber-300">
                    Frozen
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-cyan-400" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                  label="Supply APY"
                  value={formatApy(reserveData?.supplyAPY)}
                  accent="text-emerald-300"
                />
                <StatCard
                  label="Borrow APY"
                  value={formatApy(reserveData?.borrowAPY)}
                  accent="text-cyan-300"
                />
                <StatCard
                  label="Total supplied"
                  value={`${formatToken(stats?.totalDeposits, decimals)} ${symbol}`}
                />
                <StatCard
                  label="Available liquidity"
                  value={`${formatToken(stats?.availableLiquidity, decimals)} ${symbol}`}
                />
              </div>

              <section className="rounded-lg border border-slate-800 bg-slate-950/80 p-5">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                      Reserve status
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-50">
                      Utilization and risk parameters
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Utilization</p>
                    <p className="text-lg font-semibold text-cyan-300">
                      {utilization.toFixed(2)}%
                    </p>
                  </div>
                </div>
                <div className="mb-5 h-2 rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-cyan-300"
                    style={{ width: `${Math.min(utilization, 100)}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { label: "LTV", value: formatBps(reserveData?.ltvBps) },
                    {
                      label: "Liquidation threshold",
                      value: formatBps(reserveData?.liquidationThresholdBps),
                    },
                    {
                      label: "Liquidation bonus",
                      value:
                        reserveData?.liquidationBonusBps !== undefined
                          ? `${(Number(reserveData.liquidationBonusBps) / 100 - 100).toFixed(0)}%`
                          : "--",
                    },
                    { label: "Decimals", value: decimals.toString() },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-200">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {userAddress && (
                <section className="rounded-lg border border-slate-800 bg-slate-950/80 p-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Your position
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-slate-500">Wallet balance</p>
                      <p className="mt-1 text-sm font-semibold text-slate-200">
                        {formatToken(walletBalance as bigint | null, decimals)}{" "}
                        {symbol}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Supplied</p>
                      <p className="mt-1 text-sm font-semibold text-emerald-300">
                        {formatToken(
                          userReserveData?.collateralAmount,
                          decimals,
                        )}{" "}
                        {symbol}
                      </p>
                      {userReserveData?.collateralUsdWad !== undefined &&
                        userReserveData.collateralUsdWad > 0n && (
                          <p className="text-xs text-slate-500">
                            {formatUsd(userReserveData.collateralUsdWad)}
                          </p>
                        )}
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Borrowed</p>
                      <p className="mt-1 text-sm font-semibold text-red-300">
                        {formatToken(userReserveData?.debtAmount, decimals)}{" "}
                        {symbol}
                      </p>
                      {userReserveData?.debtUsdWad !== undefined &&
                        userReserveData.debtUsdWad > 0n && (
                          <p className="text-xs text-slate-500">
                            {formatUsd(userReserveData.debtUsdWad)}
                          </p>
                        )}
                    </div>
                  </div>
                </section>
              )}
            </div>

            <aside className="h-fit rounded-lg border border-slate-800 bg-slate-950/80 p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
                Actions
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-50">
                Manage {symbol}
              </h2>
              <div className="mt-5 grid gap-3">
                {actionButtons.map(({ action, label, color, disabled }) => (
                  <button
                    key={action}
                    onClick={() => setModal(action)}
                    disabled={
                      disabled ||
                      !reserveData?.isActive ||
                      reserveData?.isFrozen
                    }
                    className={`rounded-lg px-4 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${color}`}
                  >
                    {label} {symbol}
                  </button>
                ))}
              </div>
            </aside>
          </div>
        )}
      </main>

      {modal && (
        <ActionModal
          isOpen={true}
          onClose={() => setModal(null)}
          assetAddress={asset}
          assetSymbol={symbol}
          assetDecimals={decimals}
          aTokenAddress={reserveData?.aToken}
          action={modal}
        />
      )}
    </div>
  );
}

export default AssetDetail;
