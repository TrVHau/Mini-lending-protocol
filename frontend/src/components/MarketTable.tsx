import { useState } from "react";
import { Link } from "react-router-dom";
import { useMarketOverview } from "../hooks";
import ActionModal, { type ActionType } from "./ActionModal";

// APY helpers removed — rates not available from getReserveData

function MarketTable() {
  const {
    reserves,
    reserveDataByAsset,
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

  const assetList = reserves ?? [];
  const statsByAsset = marketStatsByAsset ?? {};
  const metaByAsset = tokenMetaByAsset ?? {};

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
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-8 text-center text-sm text-slate-500">
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-blue-400" />
        <p className="mt-3">Đang tải dữ liệu thị trường…</p>
      </div>
    );
  }

  if (assetList.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-8 text-center text-sm text-slate-500">
        Chưa có asset nào được khởi tạo.
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-6">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Markets
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-50">
              Market Overview
            </h2>
          </div>
          <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
            ● Live
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="min-w-full border-separate border-spacing-0">
            <thead className="bg-slate-900">
              <tr>
                {[
                  "Asset",
                  "Supply APY",
                  "Borrow APY",
                  "Tổng Deposit",
                  "Thanh khoản",
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
              {assetList.map((asset) => {
                const stats = statsByAsset[asset];
                const meta = metaByAsset[asset];
                const reserve = reserveDataByAsset?.[asset];
                const symbol = meta?.symbol ?? asset.slice(2, 6).toUpperCase();
                const name =
                  meta?.name ?? `${asset.slice(0, 6)}…${asset.slice(-4)}`;
                const decimals = Number(reserve?.assetDecimals ?? 18);

                // APY currently not returned by getReserveData; leave as unavailable
                // APY not available from getReserveData; display placeholder

                const totalDeposits = stats?.totalDeposits
                  ? (
                      Number(stats.totalDeposits) /
                      10 ** decimals
                    ).toLocaleString("en-US", { maximumFractionDigits: 2 })
                  : "--";
                const availableLiquidity = stats?.availableLiquidity
                  ? (
                      Number(stats.availableLiquidity) /
                      10 ** decimals
                    ).toLocaleString("en-US", { maximumFractionDigits: 2 })
                  : "--";

                const ltv =
                  reserve?.ltvBps !== undefined
                    ? `${(Number(reserve.ltvBps) / 100).toFixed(0)}%`
                    : "--";

                const isActive = reserve?.isActive ?? true;
                const isFrozen = reserve?.isFrozen ?? false;

                return (
                  <tr
                    key={asset}
                    className="border-b border-slate-800/60 transition-colors hover:bg-slate-900/60 last:border-0"
                  >
                    {/* Asset */}
                    <td className="px-5 py-4">
                      <Link
                        to={`/asset/${asset}`}
                        className="flex items-center gap-3 group"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-slate-700 to-slate-800 text-xs font-bold text-slate-200 border border-slate-600">
                          {symbol.slice(0, 3)}
                        </div>
                        <div>
                          <span className="block text-sm font-semibold text-slate-50 group-hover:text-blue-400 transition-colors">
                            {name}
                          </span>
                          <span className="text-xs text-slate-500">
                            {isFrozen
                              ? "🔒 Frozen"
                              : isActive
                                ? "Active"
                                : "Inactive"}
                          </span>
                        </div>
                      </Link>
                    </td>

                    {/* Supply APY */}
                    <td className="px-5 py-4">
                      <span className="text-sm font-medium text-emerald-400">
                        --
                      </span>
                    </td>

                    {/* Borrow APY */}
                    <td className="px-5 py-4">
                      <span className="text-sm font-medium text-blue-400">
                        --
                      </span>
                    </td>

                    {/* Total deposits */}
                    <td className="px-5 py-4 text-sm text-slate-200">
                      {totalDeposits}{" "}
                      <span className="text-xs text-slate-500">{symbol}</span>
                    </td>

                    {/* Available liquidity */}
                    <td className="px-5 py-4 text-sm text-slate-300">
                      {availableLiquidity}{" "}
                      <span className="text-xs text-slate-500">{symbol}</span>
                    </td>

                    {/* LTV */}
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-300">
                        {ltv}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
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
                          className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                        >
                          Nạp
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
                          className="rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-400 hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                        >
                          Vay
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Modal */}
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
