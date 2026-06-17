import { useState } from "react";
import { Link } from "react-router-dom";
import { useMarketOverview } from "../hooks";
import ActionModal, { type ActionType } from "./ActionModal";

function formatToken(amount: bigint | undefined, decimals: number): string {
  if (amount === undefined) return "--";
  return (Number(amount) / 10 ** decimals).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

function formatApy(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "--";
  if (value === 0) return "0.00%";
  return `${value.toFixed(value < 0.01 ? 4 : 2)}%`;
}

function MarketTable() {
  const {
    reserves,
    reserveDataByAsset,
    ratesByAsset,
    tokenMetaByAsset,
    marketStatsByAsset,
    isLoading,
  } = useMarketOverview();

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

  if (isLoading) {
    return (
      <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950/80 p-8 text-center text-sm text-slate-500">
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-cyan-400" />
        <p className="mt-3">Loading markets...</p>
      </div>
    );
  }

  if (reserves.length === 0) {
    return (
      <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950/80 p-8 text-center text-sm text-slate-500">
        No reserves have been initialized.
      </div>
    );
  }

  return (
    <>
      <section className="mt-5 rounded-lg border border-slate-800 bg-slate-950/80">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
              Markets
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-50">
              Supply and borrow assets
            </h2>
          </div>
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
            Live rates
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead className="bg-slate-900/80">
              <tr>
                {[
                  "Asset",
                  "Supply APY",
                  "Borrow APY",
                  "Total supplied",
                  "Total borrowed",
                  "Available",
                  "LTV",
                  "",
                ].map((h) => (
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
                const stats = marketStatsByAsset?.[asset];
                const meta = tokenMetaByAsset?.[asset];
                const reserve = reserveDataByAsset?.[asset];
                const rates = ratesByAsset?.[asset];
                const symbol = meta?.symbol ?? asset.slice(2, 6).toUpperCase();
                const name =
                  meta?.name ?? `${asset.slice(0, 6)}...${asset.slice(-4)}`;
                const decimals = Number(reserve?.assetDecimals ?? 18);
                const ltv =
                  reserve?.ltvBps !== undefined
                    ? `${(Number(reserve.ltvBps) / 100).toFixed(0)}%`
                    : "--";
                const isActive = reserve?.isActive ?? true;
                const isFrozen = reserve?.isFrozen ?? false;

                return (
                  <tr
                    key={asset}
                    className="transition-colors hover:bg-slate-900/60"
                  >
                    <td className="border-b border-slate-800/70 px-5 py-4">
                      <Link
                        to={`/asset/${asset}`}
                        className="group flex items-center gap-3"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 text-xs font-bold text-cyan-100">
                          {symbol.slice(0, 3)}
                        </div>
                        <div>
                          <span className="block text-sm font-semibold text-slate-50 transition-colors group-hover:text-cyan-300">
                            {name}
                          </span>
                          <span className="text-xs text-slate-500">
                            {isFrozen
                              ? "Frozen"
                              : isActive
                                ? "Active"
                                : "Inactive"}
                          </span>
                        </div>
                      </Link>
                    </td>

                    <td className="border-b border-slate-800/70 px-5 py-4">
                      <span className="text-sm font-semibold text-emerald-300">
                        {formatApy(rates?.supplyAPY)}
                      </span>
                    </td>

                    <td className="border-b border-slate-800/70 px-5 py-4">
                      <span className="text-sm font-semibold text-cyan-300">
                        {formatApy(rates?.borrowAPY)}
                      </span>
                    </td>

                    <td className="border-b border-slate-800/70 px-5 py-4 text-sm text-slate-200">
                      {formatToken(stats?.totalDeposits, decimals)}{" "}
                      <span className="text-xs text-slate-500">{symbol}</span>
                    </td>

                    <td className="border-b border-slate-800/70 px-5 py-4 text-sm text-slate-200">
                      {formatToken(stats?.totalBorrowed, decimals)}{" "}
                      <span className="text-xs text-slate-500">{symbol}</span>
                    </td>

                    <td className="border-b border-slate-800/70 px-5 py-4 text-sm text-slate-300">
                      {formatToken(stats?.availableLiquidity, decimals)}{" "}
                      <span className="text-xs text-slate-500">{symbol}</span>
                    </td>

                    <td className="border-b border-slate-800/70 px-5 py-4">
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-300">
                        {ltv}
                      </span>
                    </td>

                    <td className="border-b border-slate-800/70 px-5 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            openModal(
                              "deposit",
                              asset,
                              symbol,
                              decimals,
                              reserve?.aToken,
                            )
                          }
                          disabled={!isActive || isFrozen}
                          className="rounded-lg bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Supply
                        </button>
                        <button
                          onClick={() =>
                            openModal(
                              "borrow",
                              asset,
                              symbol,
                              decimals,
                              reserve?.aToken,
                            )
                          }
                          disabled={!isActive || isFrozen}
                          className="rounded-lg bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Borrow
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

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
    </>
  );
}

export default MarketTable;
