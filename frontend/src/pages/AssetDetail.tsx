// AssetDetail: Chi tiết 1 asset — APY, LTV, thông tin reserve, + form action theo asset.
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAccount } from "wagmi";
import Navbar from "../components/Navbar";
import ActionModal, { type ActionType } from "../components/ActionModal";
import {
  useReserveData,
  useUserReserveData,
  useTokenBalance,
  useMarketOverview,
} from "../hooks";

const WAD = 1e18;

function formatUsd(wad: bigint) {
  return (Number(wad) / WAD).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function formatToken(amount: bigint, decimals: number): string {
  const val = Number(amount) / 10 ** decimals;
  return val.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold text-slate-50">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
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
      <div className="min-h-screen bg-slate-950 text-slate-50 md:pl-72">
        <Navbar />
        <main className="px-6 py-10 text-center text-slate-500">
          Địa chỉ asset không hợp lệ.{" "}
          <Link to="/markets" className="text-blue-400 hover:underline">
            Quay lại Markets
          </Link>
        </main>
      </div>
    );
  }

  const meta = tokenMetaByAsset?.[asset];
  const stats = marketStatsByAsset?.[asset];
  const symbol = meta?.symbol ?? asset.slice(2, 6).toUpperCase();
  const name = meta?.name ?? `${asset.slice(0, 8)}…${asset.slice(-4)}`;
  const decimals = Number(reserveData?.assetDecimals ?? 18);

  // APY rates are not exposed by `getReserveData` (only indexes are),
  // so show as unavailable for now.
  // APY not available from getReserveData; show placeholder

  const ltv =
    reserveData?.ltvBps !== undefined
      ? `${(Number(reserveData.ltvBps) / 100).toFixed(0)}%`
      : "--";
  const liqThreshold =
    reserveData?.liquidationThresholdBps !== undefined
      ? `${(Number(reserveData.liquidationThresholdBps) / 100).toFixed(0)}%`
      : "--";
  const liqBonus =
    reserveData?.liquidationBonusBps !== undefined
      ? `${(Number(reserveData.liquidationBonusBps) / 100 - 100).toFixed(0)}%`
      : "--";

  const totalDeposits = stats?.totalDeposits
    ? formatToken(stats.totalDeposits, decimals)
    : "--";
  const availableLiquidity = stats?.availableLiquidity
    ? formatToken(stats.availableLiquidity, decimals)
    : "--";

  const ACTION_BTNS: {
    action: ActionType;
    label: string;
    color: string;
    disabled?: boolean;
  }[] = [
    {
      action: "deposit",
      label: "Nạp",
      color: "bg-emerald-500 hover:bg-emerald-600",
    },
    {
      action: "withdraw",
      label: "Rút",
      color: "bg-amber-500 hover:bg-amber-600",
      disabled: !userReserveData || userReserveData.collateralAmount === 0n,
    },
    { action: "borrow", label: "Vay", color: "bg-blue-500 hover:bg-blue-600" },
    {
      action: "repay",
      label: "Trả nợ",
      color: "bg-purple-500 hover:bg-purple-600",
      disabled: !userReserveData || userReserveData.debtAmount === 0n,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 md:pl-72">
      <Navbar />
      <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        {/* Back */}
        <Link
          to="/markets"
          className="mb-5 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          ← Quay lại Markets
        </Link>

        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-slate-700 to-slate-800 text-lg font-bold text-slate-100 border border-slate-600 shadow-lg">
            {symbol.slice(0, 3)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-50">{name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-mono text-slate-400">
                {symbol}
              </span>
              {reserveData?.isActive ? (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                  Active
                </span>
              ) : (
                <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
                  Inactive
                </span>
              )}
              {reserveData?.isFrozen && (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
                  Frozen
                </span>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-blue-400" />
          </div>
        ) : (
          <>
            {/* Market stats */}
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Supply APY" value={"--"} sub="Lãi suất nạp" />
              <StatCard label="Borrow APY" value={"--"} sub="Lãi suất vay" />
              <StatCard
                label="Tổng Deposit"
                value={`${totalDeposits} ${symbol}`}
                sub="aToken total supply"
              />
              <StatCard
                label="Thanh khoản"
                value={`${availableLiquidity} ${symbol}`}
                sub="Có thể vay ngay"
              />
            </div>

            {/* Risk params */}
            <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="mb-4 text-sm font-semibold text-slate-300">
                Thông số rủi ro
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: "LTV", value: ltv },
                  { label: "Ngưỡng thanh lý", value: liqThreshold },
                  { label: "Bonus thanh lý", value: liqBonus },
                  { label: "Decimals", value: decimals.toString() },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-200">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* User position */}
            {userAddress && (
              <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <h2 className="mb-4 text-sm font-semibold text-slate-300">
                  Vị thế của bạn
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-slate-500">Số dư ví</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-200">
                      {walletBalance !== null
                        ? `${formatToken(walletBalance as bigint, decimals)} ${symbol}`
                        : "--"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Collateral đã nạp</p>
                    <p className="mt-0.5 text-sm font-semibold text-emerald-400">
                      {userReserveData
                        ? `${formatToken(userReserveData.collateralAmount, decimals)} ${symbol}`
                        : "--"}
                    </p>
                    {userReserveData &&
                      userReserveData.collateralUsdWad > 0n && (
                        <p className="text-xs text-slate-500">
                          {formatUsd(userReserveData.collateralUsdWad)}
                        </p>
                      )}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Nợ hiện tại</p>
                    <p className="mt-0.5 text-sm font-semibold text-red-400">
                      {userReserveData
                        ? `${formatToken(userReserveData.debtAmount, decimals)} ${symbol}`
                        : "--"}
                    </p>
                    {userReserveData && userReserveData.debtUsdWad > 0n && (
                      <p className="text-xs text-slate-500">
                        {formatUsd(userReserveData.debtUsdWad)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              {ACTION_BTNS.map(({ action, label, color, disabled }) => (
                <button
                  key={action}
                  onClick={() => setModal(action)}
                  disabled={
                    disabled || !reserveData?.isActive || reserveData?.isFrozen
                  }
                  className={`rounded-xl px-8 py-3 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40 ${color}`}
                >
                  {label} {symbol}
                </button>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Modal */}
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
