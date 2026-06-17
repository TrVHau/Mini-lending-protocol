import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import Navbar from "../components/Navbar";
import {
  useMarketOverview,
  useMintMockToken,
  useTokenBalance,
} from "../hooks";

function parseAmount(raw: string, decimals: number): bigint {
  try {
    const [int, frac = ""] = raw.split(".");
    const cleanInt = int === "" ? "0" : int;
    const fracPadded = frac.padEnd(decimals, "0").slice(0, decimals);
    return BigInt(cleanInt + fracPadded);
  } catch {
    return 0n;
  }
}

function formatToken(amount: bigint | null | undefined, decimals: number) {
  if (amount === null || amount === undefined) return "--";
  const value = Number(amount) / 10 ** decimals;
  return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function shortAddress(address: `0x${string}`) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

type FaucetRowProps = {
  asset: `0x${string}`;
  name: string;
  symbol: string;
  decimals: number;
  recipient?: `0x${string}`;
  amount: string;
};

function FaucetRow({
  asset,
  name,
  symbol,
  decimals,
  recipient,
  amount,
}: FaucetRowProps) {
  const mintAmount = useMemo(
    () => parseAmount(amount, decimals),
    [amount, decimals],
  );
  const { balance } = useTokenBalance(recipient, asset);
  const faucet = useMintMockToken(asset, recipient, mintAmount);
  const isBusy = faucet.isPending || faucet.isConfirming;

  return (
    <div className="grid gap-4 rounded-lg border border-slate-800 bg-slate-950/80 p-4 lg:grid-cols-[1.2fr_1fr_auto] lg:items-center">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 text-xs font-bold text-cyan-100">
          {symbol.slice(0, 3)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-50">{name}</p>
          <p className="font-mono text-xs text-slate-500">
            {symbol} - {shortAddress(asset)}
          </p>
        </div>
      </div>

      <div>
        <p className="text-xs text-slate-500">Wallet balance</p>
        <p className="mt-1 text-sm font-semibold text-slate-200">
          {formatToken(balance as bigint | null, decimals)} {symbol}
        </p>
      </div>

      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center lg:justify-end">
        {faucet.isSuccess && (
          <span className="text-xs font-medium text-emerald-300">Minted</span>
        )}
        {faucet.error && (
          <span className="max-w-56 truncate text-xs text-red-300">
            {faucet.error.message?.split("(")[0] ?? "Mint failed"}
          </span>
        )}
        <button
          onClick={() => faucet.mint()}
          disabled={!faucet.canMint || isBusy}
          className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {faucet.isConfirming
            ? "Confirming..."
            : faucet.isPending
              ? "Minting..."
              : `Mint ${symbol}`}
        </button>
      </div>
    </div>
  );
}

function Faucet() {
  const { address, isConnected } = useAccount();
  const { reserves, reserveDataByAsset, tokenMetaByAsset, isLoading } =
    useMarketOverview();
  const [amount, setAmount] = useState("1000");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <Navbar />
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
              Faucet
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-50">
              Mint local test tokens
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              These mock reserve tokens expose a public mint function for local
              development. Mint them to your connected wallet, then supply them
              in the market.
            </p>
          </div>

          <label className="block min-w-56">
            <span className="mb-1.5 block text-xs font-medium text-slate-400">
              Amount per mint
            </span>
            <input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400"
            />
          </label>
        </div>

        {!isConnected ? (
          <section className="rounded-lg border border-slate-800 bg-slate-950/80 p-6 text-sm text-slate-500">
            Connect your wallet to mint faucet tokens.
          </section>
        ) : isLoading ? (
          <section className="rounded-lg border border-slate-800 bg-slate-950/80 p-8 text-center text-sm text-slate-500">
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-cyan-400" />
            <p className="mt-3">Loading reserve tokens...</p>
          </section>
        ) : reserves.length === 0 ? (
          <section className="rounded-lg border border-slate-800 bg-slate-950/80 p-6 text-sm text-slate-500">
            No reserve tokens found. Deploy and initialize reserves first.
          </section>
        ) : (
          <section className="flex flex-col gap-3">
            {reserves.map((asset) => {
              const reserve = reserveDataByAsset?.[asset];
              const meta = tokenMetaByAsset?.[asset];
              const symbol = meta?.symbol ?? asset.slice(2, 6).toUpperCase();
              const name =
                meta?.name ?? `${asset.slice(0, 6)}...${asset.slice(-4)}`;
              const decimals = Number(reserve?.assetDecimals ?? 18);

              return (
                <FaucetRow
                  key={asset}
                  asset={asset}
                  name={name}
                  symbol={symbol}
                  decimals={decimals}
                  recipient={address}
                  amount={amount}
                />
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}

export default Faucet;
