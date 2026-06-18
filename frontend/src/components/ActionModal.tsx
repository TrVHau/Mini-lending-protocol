import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import {
  useAllowance,
  useAssetPrice,
  useApprove,
  useBorrow,
  useDeposit,
  useRepay,
  useTokenBalance,
  useUserAccountData,
  useUserReserveData,
  useWithdraw,
} from "../hooks";
import { LENDING_POOL_ADDRESS } from "../config/contracts";

export type ActionType = "deposit" | "withdraw" | "borrow" | "repay";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  assetAddress: `0x${string}`;
  assetSymbol: string;
  assetDecimals: number;
  aTokenAddress?: `0x${string}`;
  action: ActionType;
}

const LABEL: Record<ActionType, string> = {
  deposit: "Supply",
  withdraw: "Withdraw",
  borrow: "Borrow",
  repay: "Repay",
};

const BALANCE_LABEL: Record<ActionType, string> = {
  deposit: "Wallet balance",
  withdraw: "Supplied balance",
  borrow: "Available to borrow",
  repay: "Borrow balance",
};

const ACTION_COLOR: Record<ActionType, string> = {
  deposit: "bg-emerald-400 text-slate-950 hover:bg-emerald-300",
  withdraw: "bg-slate-700 text-slate-50 hover:bg-slate-600",
  borrow: "bg-cyan-400 text-slate-950 hover:bg-cyan-300",
  repay: "bg-slate-700 text-slate-50 hover:bg-slate-600",
};

const WAD = 1e18;
const WAD_BIG = 10n ** 18n;
const MAX_UINT =
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

function parseAmount(raw: string, decimals: number): bigint {
  try {
    const [int, frac = ""] = raw.split(".");
    const cleanInt = int === "" || int === "-" ? "0" : int;
    const fracPadded = frac.padEnd(decimals, "0").slice(0, decimals);
    const result = BigInt(cleanInt + fracPadded);
    return result >= 0n ? result : 0n;
  } catch {
    return 0n;
  }
}

function formatAmount(raw: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const int = raw / divisor;
  const frac = raw % divisor;
  if (frac === 0n) return int.toString();
  return `${int}.${frac.toString().padStart(decimals, "0").replace(/0+$/, "")}`;
}

function formatHealthFactor(hf?: bigint): string {
  if (!hf) return "--";
  if (hf === BigInt(MAX_UINT)) return "Max";
  return (Number(hf) / WAD).toFixed(2);
}

function usdWadToAssetAmount(
  usdWad: bigint,
  priceWad: bigint,
  decimals: number,
) {
  if (priceWad === 0n) return 0n;

  const amountWad = (usdWad * WAD_BIG) / priceWad;
  if (decimals === 18) return amountWad;
  if (decimals < 18) return amountWad / 10n ** BigInt(18 - decimals);
  return amountWad * 10n ** BigInt(decimals - 18);
}

export default function ActionModal({
  isOpen,
  onClose,
  assetAddress,
  assetSymbol,
  assetDecimals,
  aTokenAddress,
  action,
}: Props) {
  const { address } = useAccount();
  const [rawInput, setRawInput] = useState("");
  const [isMaxRepay, setIsMaxRepay] = useState(false);
  const [step, setStep] = useState<
    "input" | "approving" | "executing" | "done"
  >("input");

  // When repaying the full balance, send uint256.max so the contract uses the
  // live borrow index — not our stale cached debt amount. This ensures
  // per-second interest that accrued between the read and the tx is included.
  const MAX_UINT256 = 2n ** 256n - 1n;
  const parsedInput = rawInput ? parseAmount(rawInput, assetDecimals) : 0n;
  const amountBig =
    isMaxRepay && action === "repay" ? MAX_UINT256 : parsedInput;

  const { accountData } = useUserAccountData(address);
  const { balance: walletBalance } = useTokenBalance(address, assetAddress);
  const { balance: reserveLiquidity } = useTokenBalance(
    action === "borrow" ? aTokenAddress : null,
    action === "borrow" ? assetAddress : null,
  );
  const { userReserveData } = useUserReserveData(address, assetAddress);
  const { priceWad } = useAssetPrice(assetAddress);

  const needsApproval = action === "deposit" || action === "repay";
  const { allowance, isLoading: allowanceLoading } = useAllowance(
    needsApproval ? address : null,
    needsApproval ? LENDING_POOL_ADDRESS : null,
    needsApproval ? assetAddress : null,
  );

  // For max-repay we must approve MAX_UINT256, not the cached debtAmount.
  // Reason: the contract's repay() calls transferFrom(user, aToken, liveDebt)
  // where liveDebt includes per-second interest accrued AFTER the approve tx.
  // If we approved only the cached amount, the transfer reverts with
  // "ERC20: insufficient allowance" even though the user intended a full repay.
  const approveAmount =
    isMaxRepay && action === "repay" ? MAX_UINT256 : parsedInput;

  const approve = useApprove(assetAddress, LENDING_POOL_ADDRESS, approveAmount);
  const deposit = useDeposit(assetAddress, amountBig);
  const withdraw = useWithdraw(assetAddress, amountBig);
  const borrow = useBorrow(assetAddress, amountBig);
  const repay = useRepay(assetAddress, amountBig);

  const actionHook = { deposit, withdraw, borrow, repay }[action];

  function executeAction() {
    const fn = {
      deposit: deposit.deposit,
      withdraw: withdraw.withdraw,
      borrow: borrow.borrow,
      repay: repay.repay,
    }[action];
    fn();
  }

  useEffect(() => {
    if (approve.isSuccess && step === "approving") {
      setStep("executing");
      executeAction();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approve.isSuccess, step]);

  useEffect(() => {
    if (actionHook.isSuccess && step === "executing") {
      setStep("done");
    }
  }, [actionHook.isSuccess, step]);

  useEffect(() => {
    if (isOpen) {
      setRawInput("");
      setIsMaxRepay(false);
      setStep("input");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isApproved =
    !needsApproval ||
    allowanceLoading ||
    allowance === null ||
    (allowance as bigint) >= approveAmount;

  function handleSubmit() {
    if (amountBig === 0n) return;

    if (needsApproval && !isApproved) {
      setStep("approving");
      approve.approve();
      return;
    }

    setStep("executing");
    executeAction();
  }

  function handleClose() {
    setRawInput("");
    setStep("input");
    onClose();
  }

  const maxAmount = (() => {
    if (action === "deposit" && walletBalance !== null) {
      return formatAmount(walletBalance as bigint, assetDecimals);
    }
    if (action === "withdraw" && userReserveData) {
      return formatAmount(userReserveData.collateralAmount, assetDecimals);
    }
    if (action === "repay" && userReserveData) {
      // Display the known debt; MAX button sends uint256.max under the hood
      return formatAmount(userReserveData.debtAmount, assetDecimals);
    }
    if (action === "borrow" && accountData && priceWad !== undefined && priceWad > 0n) {
      const availableBorrowUsdWad =
        accountData.maxBorrowUsdWad > accountData.debtUsdWad
          ? accountData.maxBorrowUsdWad - accountData.debtUsdWad
          : 0n;
      if (availableBorrowUsdWad === 0n) return "0";

      const borrowCapacityRaw = usdWadToAssetAmount(
        availableBorrowUsdWad,
        priceWad,
        assetDecimals,
      );
      // Subtract 1 unit (smallest denomination) to avoid landing exactly on the
      // collateral ceiling — the contract's _assetToUsdWad can round up by 1 wei,
      // causing an INSUFFICIENT_COLLATERAL revert at the exact boundary.
      const borrowCapacity =
        borrowCapacityRaw > 1n ? borrowCapacityRaw - 1n : borrowCapacityRaw;

      const liquidity = reserveLiquidity as bigint | null;
      const maxBorrow =
        liquidity !== null && liquidity < borrowCapacity
          ? liquidity
          : borrowCapacity;

      return formatAmount(maxBorrow, assetDecimals);
    }
    return null;
  })();

  const isPending =
    step === "approving"
      ? approve.isPending || approve.isConfirming
      : step === "executing"
        ? actionHook.isPending || actionHook.isConfirming
        : false;

  const txError = step === "approving" ? approve.error : actionHook.error;

  const btnLabel = () => {
    if (step === "done") return "Transaction complete";
    if (step === "approving") {
      return approve.isConfirming ? "Confirming approval..." : "Approving...";
    }
    if (step === "executing") {
      return actionHook.isConfirming
        ? "Confirming transaction..."
        : "Submitting...";
    }
    if (!isApproved) return `Approve ${assetSymbol}`;
    return `${LABEL[action]} ${assetSymbol}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-950 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-50">
            {LABEL[action]}{" "}
            <span className="text-slate-400">{assetSymbol}</span>
          </h2>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
            aria-label="Close modal"
          >
            X
          </button>
        </div>

        {step === "done" ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/15 text-2xl font-semibold text-emerald-300">
              OK
            </div>
            <p className="text-lg font-semibold text-emerald-300">
              Transaction submitted successfully.
            </p>
            <button
              onClick={handleClose}
              className="mt-2 rounded-lg bg-slate-800 px-6 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between rounded-lg bg-slate-900 px-4 py-2 text-xs text-slate-400">
              <span>{BALANCE_LABEL[action]}</span>
              <span className="font-mono text-slate-200">
                {maxAmount ?? "--"} {assetSymbol}
              </span>
            </div>

            <div className="mb-2 flex items-center overflow-hidden rounded-lg border border-slate-700 bg-slate-900 focus-within:border-cyan-400">
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={rawInput}
                onChange={(event) => {
                  setRawInput(event.target.value);
                  setIsMaxRepay(false); // manual edit cancels max-repay mode
                }}
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-lg font-semibold text-slate-50 outline-none placeholder:text-slate-600"
              />
              <div className="flex items-center gap-2 pr-4">
                {maxAmount && (
                  <button
                    type="button"
                    onClick={() => {
                      setRawInput(maxAmount);
                      if (action === "repay") setIsMaxRepay(true);
                    }}
                    className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-300 transition-colors hover:bg-slate-600"
                  >
                    MAX
                  </button>
                )}
                <span className="text-sm font-medium text-slate-400">
                  {assetSymbol}
                </span>
              </div>
            </div>

            <div className="mb-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Health factor</span>
                <span className="text-slate-400">Before - After</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm font-semibold">
                <span className="text-slate-100">
                  {formatHealthFactor(accountData?.healthFactorWad)}
                </span>
                <span className="text-slate-500">to</span>
                <span className="text-cyan-300">Updates on-chain</span>
              </div>
            </div>

            {needsApproval && amountBig > 0n && !isApproved && (
              <div className="mb-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                This action needs token approval before the transaction.
              </div>
            )}

            {txError && (
              <div className="mb-3 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">
                {txError.message?.split("(")[0] ?? "Transaction failed"}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={
                amountBig === 0n || isPending || (step as string) === "done"
              }
              className={`mt-3 w-full rounded-lg py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${ACTION_COLOR[action]}`}
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {btnLabel()}
                </span>
              ) : (
                btnLabel()
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
