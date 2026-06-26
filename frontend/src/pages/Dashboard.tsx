import { useConnection as useAccount } from "wagmi";
import AccountSummary from "../components/AccountSummary";
import Navbar from "../components/Navbar";
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
  const value = Number(amount) / 10 ** decimals;
  return `${value.toLocaleString("en-US", {
    maximumFractionDigits: 4,
  })} ${symbol}`;
}

function formatApy(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return "--";
  return `${value.toFixed(value < 0.01 && value > 0 ? 4 : 2)}%`;
}

type PositionRowProps = {
  asset: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  aToken?: `0x${string}`;
  userAddress: `0x${string}`;
  apy?: number;
  mode: "supply" | "borrow";
};

function PositionRow({
  asset,
  symbol,
  name,
  decimals,
  userAddress,
  apy,
  mode,
}: PositionRowProps) {
  const { userReserveData, isLoading } = useUserReserveData(userAddress, asset);
  const amount =
    mode === "supply"
      ? userReserveData?.collateralAmount
      : userReserveData?.debtAmount;
  const usd =
    mode === "supply"
      ? userReserveData?.collateralUsdWad
      : userReserveData?.debtUsdWad;

  if (isLoading) {
    return (
      <div className="rounded-lg bg-slate-900/60 p-4 text-sm text-slate-500">
        Loading...
      </div>
    );
  }

  if (!amount || amount === 0n) return null;

  return (
    <div className="grid gap-4 rounded-lg border border-slate-800 bg-slate-950/80 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 text-xs font-bold text-cyan-100">
          {symbol.slice(0, 3)}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-50">{name}</p>
          <p className="text-xs text-slate-500">{symbol}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm sm:min-w-96">
        <div>
          <p className="text-xs text-slate-500">Balance</p>
          <p className="mt-1 font-semibold text-slate-100">
            {formatToken(amount, decimals, symbol)}
          </p>
          {usd !== undefined && (
            <p className="text-xs text-slate-500">{formatUsd(usd)}</p>
          )}
        </div>
        <div>
          <p className="text-xs text-slate-500">APY</p>
          <p className="mt-1 font-semibold text-emerald-300">
            {formatApy(apy)}
          </p>
          <p className="text-xs text-slate-500">
            {mode === "supply" ? "Collateral enabled" : "Variable rate"}
          </p>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const { address, isConnected } = useAccount();
  const { reserves, reserveDataByAsset, ratesByAsset, tokenMetaByAsset } =
    useMarketOverview();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <Navbar />
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <AccountSummary />

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {(["supply", "borrow"] as const).map((mode) => (
            <section
              key={mode}
              className="rounded-lg border border-slate-800 bg-slate-950/70"
            >
              <div className="border-b border-slate-800 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  {mode === "supply" ? "Your supplies" : "Your borrows"}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-50">
                  {mode === "supply"
                    ? "Assets earning supply APY"
                    : "Open variable debt"}
                </h2>
              </div>

              {!isConnected ? (
                <div className="p-5 text-sm text-slate-500">
                  Connect your wallet to view this section.
                </div>
              ) : (
                <div className="flex flex-col gap-3 p-4">
                  {reserves.map((asset) => {
                    const reserve = reserveDataByAsset?.[asset];
                    const meta = tokenMetaByAsset?.[asset];
                    const symbol =
                      meta?.symbol ?? asset.slice(2, 6).toUpperCase();
                    const name =
                      meta?.name ?? `${asset.slice(0, 6)}...${asset.slice(-4)}`;
                    const decimals = Number(reserve?.assetDecimals ?? 18);
                    const apy =
                      mode === "supply"
                        ? ratesByAsset?.[asset]?.supplyAPY
                        : ratesByAsset?.[asset]?.borrowAPY;

                    return (
                      <PositionRow
                        key={`${mode}-${asset}`}
                        asset={asset}
                        symbol={symbol}
                        name={name}
                        decimals={decimals}
                        aToken={reserve?.aToken}
                        userAddress={address!}
                        apy={apy}
                        mode={mode}
                      />
                    );
                  })}
                  <p className="px-1 text-xs text-slate-600">
                    Assets with an active balance appear here.
                  </p>
                </div>
              )}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
