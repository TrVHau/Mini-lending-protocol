import { Link } from "react-router-dom";
import { useMarketOverview, useAssetPrice } from "../hooks";
import type {
  MarketStats,
  TokenMeta,
  ReserveData,
  ReserveRates,
} from "../hooks/contract/useMarketOverview";
import PriceSparkline from "./PriceSparkline";

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

function formatUsdPrice(priceWad?: bigint): string {
  if (priceWad === undefined || priceWad === 0n) return "--";
  const num = Number(priceWad) / 1e18;
  if (num >= 1000) {
    return num.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (num >= 1) {
    return num.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }
  return num.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  });
}

type MarketTableRowProps = {
  asset: `0x${string}`;
  stats?: MarketStats;
  meta?: TokenMeta;
  reserve?: ReserveData;
  rates?: ReserveRates;
};

function MarketTableRow({
  asset,
  stats,
  meta,
  reserve,
  rates,
}: MarketTableRowProps) {
  const { priceWad } = useAssetPrice(asset);

  const symbol = meta?.symbol ?? asset.slice(2, 6).toUpperCase();
  const name = meta?.name ?? `${asset.slice(0, 6)}...${asset.slice(-4)}`;
  const decimals = Number(reserve?.assetDecimals ?? 18);
  const ltv =
    reserve?.ltvBps !== undefined
      ? `${(Number(reserve.ltvBps) / 100).toFixed(0)}%`
      : "--";
  const isActive = reserve?.isActive ?? true;
  const isFrozen = reserve?.isFrozen ?? false;

  return (
    <tr className="transition-colors hover:bg-slate-900/60">
      {/* Asset */}
      <td className="border-b border-slate-800/70 px-5 py-4">
        <Link to={`/asset/${asset}`} className="group flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 text-xs font-bold text-cyan-100">
            {symbol.slice(0, 3)}
          </div>
          <div>
            <span className="block text-sm font-semibold text-slate-50 transition-colors group-hover:text-cyan-300">
              {name}
            </span>
            <span className="text-xs text-slate-500">
              {isFrozen ? "Frozen" : isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </Link>
      </td>

      {/* Price */}
      <td className="border-b border-slate-800/70 px-5 py-4 font-mono text-sm font-semibold text-slate-100">
        {formatUsdPrice(priceWad)}
      </td>

      {/* 24h Trend Chart */}
      <td className="border-b border-slate-800/70 px-5 py-4">
        <PriceSparkline symbol={symbol} priceWad={priceWad} width={80} height={28} />
      </td>

      {/* Supply APY */}
      <td className="border-b border-slate-800/70 px-5 py-4">
        <span className="text-sm font-semibold text-emerald-300">
          {formatApy(rates?.supplyAPY)}
        </span>
      </td>

      {/* Borrow APY */}
      <td className="border-b border-slate-800/70 px-5 py-4">
        <span className="text-sm font-semibold text-cyan-300">
          {formatApy(rates?.borrowAPY)}
        </span>
      </td>

      {/* Total Supplied */}
      <td className="border-b border-slate-800/70 px-5 py-4 text-sm text-slate-200">
        {formatToken(stats?.totalDeposits, decimals)}{" "}
        <span className="text-xs text-slate-500">{symbol}</span>
      </td>

      {/* Total Borrowed */}
      <td className="border-b border-slate-800/70 px-5 py-4 text-sm text-slate-200">
        {formatToken(stats?.totalBorrowed, decimals)}{" "}
        <span className="text-xs text-slate-500">{symbol}</span>
      </td>

      {/* Available */}
      <td className="border-b border-slate-800/70 px-5 py-4 text-sm text-slate-300">
        {formatToken(stats?.availableLiquidity, decimals)}{" "}
        <span className="text-xs text-slate-500">{symbol}</span>
      </td>

      {/* LTV */}
      <td className="border-b border-slate-800/70 px-5 py-4">
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-300">
          {ltv}
        </span>
      </td>
    </tr>
  );
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
                  "Price",
                  "24h Trend",
                  "Supply APY",
                  "Borrow APY",
                  "Total supplied",
                  "Total borrowed",
                  "Available",
                  "LTV",
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

                return (
                  <MarketTableRow
                    key={asset}
                    asset={asset}
                    stats={stats}
                    meta={meta}
                    reserve={reserve}
                    rates={rates}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default MarketTable;
