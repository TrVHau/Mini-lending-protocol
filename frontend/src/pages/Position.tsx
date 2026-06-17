import { useState } from "react";
import { useAccount } from "wagmi";
import Navbar from "../components/Navbar";
import AccountSummary from "../components/AccountSummary";
import ActionModal, { type ActionType } from "../components/ActionModal";
import { useMarketOverview, useUserReserveData } from "../hooks";

const WAD = 1e18;

function formatUsd(wad: bigint) {
  return (Number(wad) / WAD).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function formatToken(amount: bigint, decimals: number, symbol: string) {
  const val = Number(amount) / 10 ** decimals;
  return `${val.toLocaleString("en-US", { maximumFractionDigits: 4 })} ${symbol}`;
}

interface AssetRowProps {
  asset: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  aToken?: `0x${string}`;
  userAddress: `0x${string}`;
  onAction: (
    action: ActionType,
    asset: `0x${string}`,
    symbol: string,
    decimals: number,
    aToken?: `0x${string}`,
  ) => void;
}

function AssetPositionRow({
  asset,
  symbol,
  name,
  decimals,
  aToken,
  userAddress,
  onAction,
}: AssetRowProps) {
  const { userReserveData, isLoading } = useUserReserveData(userAddress, asset);

  if (isLoading) {
    return (
      <tr className="border-b border-slate-800/60">
        <td colSpan={5} className="px-5 py-4 text-sm text-slate-600">
          Loading...
        </td>
      </tr>
    );
  }

  const hasPosition =
    (userReserveData?.collateralAmount ?? 0n) > 0n ||
    (userReserveData?.debtAmount ?? 0n) > 0n;

  if (!hasPosition) return null;

  return (
    <tr className="border-b border-slate-800/60 transition-colors hover:bg-slate-900/40 last:border-0">
      {/* Asset */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-slate-700 to-slate-800 text-xs font-bold text-slate-200 border border-slate-600">
            {symbol.slice(0, 3)}
          </div>
          <div>
            <span className="block text-sm font-semibold text-slate-50">
              {name}
            </span>
            <span className="text-xs text-slate-500">{symbol}</span>
          </div>
        </div>
      </td>

      {/* Collateral */}
      <td className="px-5 py-4">
        {userReserveData && userReserveData.collateralAmount > 0n ? (
          <div>
            <p className="text-sm font-semibold text-emerald-400">
              {formatToken(userReserveData.collateralAmount, decimals, symbol)}
            </p>
            <p className="text-xs text-slate-500">
              {formatUsd(userReserveData.collateralUsdWad)}
            </p>
          </div>
        ) : (
          <span className="text-sm text-slate-600">--</span>
        )}
      </td>

      {/* Debt */}
      <td className="px-5 py-4">
        {userReserveData && userReserveData.debtAmount > 0n ? (
          <div>
            <p className="text-sm font-semibold text-red-400">
              {formatToken(userReserveData.debtAmount, decimals, symbol)}
            </p>
            <p className="text-xs text-slate-500">
              {formatUsd(userReserveData.debtUsdWad)}
            </p>
          </div>
        ) : (
          <span className="text-sm text-slate-600">--</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-5 py-4">
        <div className="flex flex-wrap gap-1.5">
          {userReserveData && userReserveData.collateralAmount > 0n && (
            <button
              onClick={() =>
                onAction("withdraw", asset, symbol, decimals, aToken)
              }
              className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-colors"
            >
              Withdraw
            </button>
          )}
          {userReserveData && userReserveData.debtAmount > 0n && (
            <button
              onClick={() => onAction("repay", asset, symbol, decimals, aToken)}
              className="rounded-lg bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-400 hover:bg-purple-500/20 transition-colors"
            >
              Repay
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function Position() {
  const { address, isConnected } = useAccount();
  const { reserves, reserveDataByAsset, tokenMetaByAsset, isLoading } =
    useMarketOverview();

  const [modal, setModal] = useState<{
    open: boolean;
    action: ActionType;
    asset: `0x${string}`;
    symbol: string;
    decimals: number;
    aToken?: `0x${string}`;
  } | null>(null);

  function openModal(
    action: ActionType,
    asset: `0x${string}`,
    symbol: string,
    decimals: number,
    aToken?: `0x${string}`,
  ) {
    setModal({ open: true, action, asset, symbol, decimals, aToken });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <Navbar />
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Portfolio
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-50">
            My positions
          </h1>
        </div>

        <AccountSummary />

        {!isConnected ? (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-10 text-center">
            <p className="text-slate-500">
              Connect your wallet to view your positions.
            </p>
          </div>
        ) : isLoading ? (
          <div className="mt-6 flex justify-center py-10">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-blue-400" />
          </div>
        ) : (
          <div className="mt-2 rounded-xl border border-slate-800 bg-slate-950">
            <div className="px-6 py-4 border-b border-slate-800">
              <h2 className="text-base font-semibold text-slate-100">
                Positions by asset
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead className="bg-slate-900">
                  <tr>
                    {["Asset", "Collateral", "Debt", "Actions"].map((h) => (
                      <th
                        key={h}
                        className="border-b border-slate-800 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reserves.map((asset) => {
                    const reserve = reserveDataByAsset?.[asset];
                    const meta = tokenMetaByAsset?.[asset];
                    const symbol =
                      meta?.symbol ?? asset.slice(2, 6).toUpperCase();
                    const name =
                      meta?.name ?? `${asset.slice(0, 6)}…${asset.slice(-4)}`;
                    const decimals = Number(reserve?.assetDecimals ?? 18);
                    return (
                      <AssetPositionRow
                        key={asset}
                        asset={asset}
                        symbol={symbol}
                        name={name}
                        decimals={decimals}
                        aToken={reserve?.aToken}
                        userAddress={address!}
                        onAction={openModal}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
            {reserves.length === 0 && (
              <div className="px-6 py-8 text-center text-sm text-slate-600">
                No positions yet.
              </div>
            )}
          </div>
        )}
      </main>

      {modal && (
        <ActionModal
          isOpen={modal.open}
          onClose={() => setModal(null)}
          assetAddress={modal.asset}
          assetSymbol={modal.symbol}
          assetDecimals={modal.decimals}
          aTokenAddress={modal.aToken}
          action={modal.action}
        />
      )}
    </div>
  );
}

export default Position;
