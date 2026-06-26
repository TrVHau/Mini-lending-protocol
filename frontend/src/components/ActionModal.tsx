import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { useConnection as useAccount } from "wagmi";
import { LENDING_POOL_ADDRESS } from "../config/contracts";
import {
  useAllowance,
  useApprove,
  useAssetPrice,
  useLendingPoolAction,
  useReserveData,
  useTokenBalance,
  useUserAccountData,
  useUserReserveData,
} from "../hooks";

export type ActionType = "supply" | "withdraw" | "borrow" | "repay";

type MaxMode = "none" | "repayAll" | "withdrawAll";
type TransactionStep = "input" | "approving" | "executing" | "done";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  assetAddress: `0x${string}`;
  assetSymbol: string;
  assetDecimals: number;
  aTokenAddress?: `0x${string}`;
  action: ActionType;
}

interface SubmittedRequest {
  amount: bigint;
  maxMode: MaxMode;
}

const LABEL: Record<ActionType, string> = {
  supply: "Supply",
  withdraw: "Withdraw",
  borrow: "Borrow",
  repay: "Repay",
};

const BALANCE_LABEL: Record<ActionType, string> = {
  supply: "Wallet balance",
  withdraw: "Available to withdraw",
  borrow: "Available to borrow",
  repay: "Borrow balance",
};

const ACTION_COLOR: Record<ActionType, string> = {
  supply: "bg-slate-400 text-slate-950 hover:bg-emerald-300",
  withdraw: "bg-slate-700 text-slate-50 hover:bg-slate-600",
  borrow: "bg-slate-400 text-slate-950 hover:bg-cyan-300",
  repay: "bg-slate-700 text-slate-50 hover:bg-slate-600",
};

const WAD = 10n ** 18n;
const BPS = 10_000n;
const MAX_UINT256 = 2n ** 256n - 1n;

// Treat allowances above this value as effectively unlimited. This remains
// true even for ERC-20 tokens that decrement a MAX_UINT256 allowance.
const UNLIMITED_ALLOWANCE_THRESHOLD = MAX_UINT256 / 2n;

// Use only 99.5% of the calculated borrow capacity to avoid borrowing exactly
// at the collateral boundary.
const BORROW_SAFETY_BPS = 9_950n;

// Keep the estimated health factor at or above 1.01 after a MAX withdrawal.
const MIN_WITHDRAW_HEALTH_FACTOR_WAD = 1_010_000_000_000_000_000n;

function isValidAmountInput(raw: string, decimals: number): boolean {
  if (decimals === 0) {
    return /^\d*$/.test(raw);
  }

  const pattern = new RegExp(`^\\d*(\\.\\d{0,${decimals}})?$`);
  return pattern.test(raw);
}

function parseAmount(raw: string, decimals: number): bigint {
  if (!raw || raw === ".") return 0n;

  try {
    const [integerPart = "0", fractionalPart = ""] = raw.split(".");
    const normalizedInteger = integerPart || "0";
    const normalizedFraction = fractionalPart.padEnd(decimals, "0");
    const value =
      decimals === 0
        ? normalizedInteger
        : `${normalizedInteger}${normalizedFraction}`;

    return BigInt(value || "0");
  } catch {
    return 0n;
  }
}

function formatAmount(value: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const integerPart = value / divisor;
  const fractionalPart = value % divisor;

  if (fractionalPart === 0n) {
    return integerPart.toString();
  }

  const formattedFraction = fractionalPart
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");

  return `${integerPart}.${formattedFraction}`;
}

function formatHealthFactor(healthFactor?: bigint): string {
  if (healthFactor === undefined || healthFactor === null) {
    return "--";
  }

  if (healthFactor === MAX_UINT256) {
    return "Max";
  }

  const integerPart = healthFactor / WAD;
  const decimalPart = ((healthFactor % WAD) * 100n) / WAD;

  return `${integerPart}.${decimalPart.toString().padStart(2, "0")}`;
}

function usdWadToAssetAmount(
  usdWad: bigint,
  priceWad: bigint,
  decimals: number,
): bigint {
  if (priceWad === 0n) return 0n;

  const amountWad = (usdWad * WAD) / priceWad;

  if (decimals === 18) return amountWad;
  if (decimals < 18) {
    return amountWad / 10n ** BigInt(18 - decimals);
  }

  return amountWad * 10n ** BigInt(decimals - 18);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.split("(")[0]?.trim() || "Transaction failed";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const message = (error as { message: string }).message;
    return message.split("(")[0]?.trim() || "Transaction failed";
  }

  return "Transaction failed";
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
  const [maxMode, setMaxMode] = useState<MaxMode>("none");
  const [step, setStep] = useState<TransactionStep>("input");
  const [submittedRequest, setSubmittedRequest] =
    useState<SubmittedRequest | null>(null);
  const [flowError, setFlowError] = useState<string | null>(null);

  // These refs are only read inside effects and event handlers. They ensure
  // that a stale isSuccess value from a previous transaction cannot advance
  // the current transaction flow.
  const approvalObservedPendingRef = useRef(false);
  const actionObservedPendingRef = useRef(false);

  const parsedInput = rawInput ? parseAmount(rawInput, assetDecimals) : 0n;

  const inputAmount =
    maxMode === "repayAll" || maxMode === "withdrawAll"
      ? MAX_UINT256
      : parsedInput;

  // Lock both the amount and MAX mode after submit. Editing the form can no
  // longer change the transaction that is already being approved/executed.
  const activeAmount = submittedRequest?.amount ?? inputAmount;
  const activeMaxMode = submittedRequest?.maxMode ?? maxMode;

  const isProcessing = step === "approving" || step === "executing";
  const needsApproval = action === "supply" || action === "repay";

  const { accountData } = useUserAccountData(address);
  const { reserveData } = useReserveData(assetAddress);
  const { userReserveData } = useUserReserveData(address, assetAddress);
  const { priceWad } = useAssetPrice(assetAddress);

  const { balance: walletBalance } = useTokenBalance(address, assetAddress);
  const { balance: reserveLiquidity } = useTokenBalance(
    action === "borrow" ? aTokenAddress : null,
    action === "borrow" ? assetAddress : null,
  );

  const {
    allowance,
    isLoading: isAllowanceLoading,
    error: allowanceError,
  } = useAllowance(
    needsApproval ? address : null,
    needsApproval ? LENDING_POOL_ADDRESS : null,
    needsApproval ? assetAddress : null,
  );

  const walletBalanceBig =
    typeof walletBalance === "bigint" ? walletBalance : null;
  const reserveLiquidityBig =
    typeof reserveLiquidity === "bigint" ? reserveLiquidity : null;
  const allowanceBig = typeof allowance === "bigint" ? allowance : null;
  const priceWadBig = typeof priceWad === "bigint" ? priceWad : null;

  // Approval transactions always grant MAX_UINT256. The allowance check below
  // still compares the existing allowance against the CURRENT transaction, so
  // a large allowance granted previously is reused without another approval.
  const approvalTransactionAmount = needsApproval ? MAX_UINT256 : 0n;

  const {
    approve: sendApproval,
    isPending: isApprovalPending,
    isConfirming: isApprovalConfirming,
    isSuccess: isApprovalSuccess,
    error: approvalTransactionError,
  } = useApprove(assetAddress, LENDING_POOL_ADDRESS, approvalTransactionAmount);

  const {
    execute: executeAction,
    isPending: isActionPending,
    isConfirming: isActionConfirming,
    isSuccess: isActionSuccess,
    error: actionTransactionError,
  } = useLendingPoolAction(action, assetAddress, activeAmount);

  const requiredAllowanceAmount =
    action === "repay" && activeMaxMode === "repayAll"
      ? (userReserveData?.debtAmount ?? 0n)
      : activeAmount;

  const hasUnlimitedAllowance =
    allowanceBig !== null && allowanceBig >= UNLIMITED_ALLOWANCE_THRESHOLD;

  const isAllowanceReady =
    !needsApproval ||
    (!isAllowanceLoading && allowanceBig !== null && !allowanceError);

  const isApproved =
    !needsApproval ||
    (action === "repay" && activeMaxMode === "repayAll"
      ? hasUnlimitedAllowance
      : allowanceBig !== null && allowanceBig >= requiredAllowanceAmount);

  const supplyExceedsWallet =
    action === "supply" &&
    walletBalanceBig !== null &&
    parsedInput > walletBalanceBig;

  useEffect(() => {
    if (step !== "approving") return;

    if (isApprovalPending || isApprovalConfirming) {
      approvalObservedPendingRef.current = true;
    }

    if (!approvalObservedPendingRef.current) return;

    if (approvalTransactionError) {
      approvalObservedPendingRef.current = false;
      const message = getErrorMessage(approvalTransactionError);

      const timerId = window.setTimeout(() => {
        setFlowError(message);
        setSubmittedRequest(null);
        setStep("input");
      }, 0);

      return () => window.clearTimeout(timerId);
    }

    if (isApprovalSuccess) {
      approvalObservedPendingRef.current = false;
      actionObservedPendingRef.current = false;

      const timerId = window.setTimeout(() => {
        setStep("executing");

        try {
          executeAction();
        } catch (error) {
          setFlowError(getErrorMessage(error));
          setSubmittedRequest(null);
          setStep("input");
        }
      }, 0);

      return () => window.clearTimeout(timerId);
    }
  }, [
    step,
    isApprovalPending,
    isApprovalConfirming,
    isApprovalSuccess,
    approvalTransactionError,
    executeAction,
  ]);

  useEffect(() => {
    if (step !== "executing") return;

    if (isActionPending || isActionConfirming) {
      actionObservedPendingRef.current = true;
    }

    if (!actionObservedPendingRef.current) return;

    if (actionTransactionError) {
      actionObservedPendingRef.current = false;
      const message = getErrorMessage(actionTransactionError);

      const timerId = window.setTimeout(() => {
        setFlowError(message);
        setSubmittedRequest(null);
        setStep("input");
      }, 0);

      return () => window.clearTimeout(timerId);
    }

    if (isActionSuccess) {
      actionObservedPendingRef.current = false;

      const timerId = window.setTimeout(() => {
        setStep("done");
      }, 0);

      return () => window.clearTimeout(timerId);
    }
  }, [
    step,
    isActionPending,
    isActionConfirming,
    isActionSuccess,
    actionTransactionError,
  ]);

  useEffect(() => {
    if (!isOpen) return;

    const timerId = window.setTimeout(() => {
      approvalObservedPendingRef.current = false;
      actionObservedPendingRef.current = false;
      setRawInput("");
      setMaxMode("none");
      setStep("input");
      setSubmittedRequest(null);
      setFlowError(null);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [isOpen, assetAddress, assetDecimals, action]);

  if (!isOpen) return null;

  const maxAmountBig = (() => {
    if (action === "supply" && walletBalanceBig !== null) {
      return walletBalanceBig;
    }

    if (action === "repay" && userReserveData) {
      return userReserveData.debtAmount;
    }

    if (action === "withdraw" && userReserveData) {
      const suppliedAmount = userReserveData.collateralAmount;

      if (!accountData || !reserveData || accountData.debtUsdWad === 0n) {
        return suppliedAmount;
      }

      const liquidationThresholdBps = reserveData.liquidationThresholdBps;

      if (
        liquidationThresholdBps === 0n ||
        priceWadBig === null ||
        priceWadBig === 0n ||
        accountData.healthFactorWad <= MIN_WITHDRAW_HEALTH_FACTOR_WAD
      ) {
        return 0n;
      }

      const currentLiquidationThresholdUsdWad =
        (accountData.healthFactorWad * accountData.debtUsdWad) / WAD;

      const requiredLiquidationThresholdUsdWad =
        (accountData.debtUsdWad * MIN_WITHDRAW_HEALTH_FACTOR_WAD) / WAD;

      if (
        currentLiquidationThresholdUsdWad <= requiredLiquidationThresholdUsdWad
      ) {
        return 0n;
      }

      const removableThresholdUsdWad =
        currentLiquidationThresholdUsdWad - requiredLiquidationThresholdUsdWad;

      const removableCollateralUsdWad =
        (removableThresholdUsdWad * BPS) / liquidationThresholdBps;

      const cappedWithdrawUsdWad =
        removableCollateralUsdWad < userReserveData.collateralUsdWad
          ? removableCollateralUsdWad
          : userReserveData.collateralUsdWad;

      let withdrawAmount = usdWadToAssetAmount(
        cappedWithdrawUsdWad,
        priceWadBig,
        assetDecimals,
      );

      if (withdrawAmount > suppliedAmount) {
        withdrawAmount = suppliedAmount;
      }

      if (withdrawAmount > 0n && withdrawAmount < suppliedAmount) {
        withdrawAmount -= 1n;
      }

      return withdrawAmount;
    }

    if (
      action === "borrow" &&
      accountData &&
      priceWadBig !== null &&
      priceWadBig > 0n
    ) {
      const availableBorrowUsdWad =
        accountData.maxBorrowUsdWad > accountData.debtUsdWad
          ? accountData.maxBorrowUsdWad - accountData.debtUsdWad
          : 0n;

      if (availableBorrowUsdWad === 0n) {
        return 0n;
      }

      const safeBorrowUsdWad =
        (availableBorrowUsdWad * BORROW_SAFETY_BPS) / BPS;

      let borrowAmount = usdWadToAssetAmount(
        safeBorrowUsdWad,
        priceWadBig,
        assetDecimals,
      );

      if (reserveLiquidityBig !== null && reserveLiquidityBig < borrowAmount) {
        borrowAmount = reserveLiquidityBig;
      }

      if (borrowAmount > 1n) {
        borrowAmount -= 1n;
      }

      return borrowAmount;
    }

    return null;
  })();

  const maxAmount =
    maxAmountBig !== null ? formatAmount(maxAmountBig, assetDecimals) : null;

  const maxHint = (() => {
    switch (action) {
      case "supply":
        return "MAX supplies your full wallet balance.";
      case "withdraw":
        return accountData && accountData.debtUsdWad > 0n
          ? "MAX estimates a safe withdrawal while keeping health factor at or above 1.01."
          : "MAX submits uint256.max to withdraw your full supplied balance.";
      case "borrow":
        return "MAX uses 99.5% of your available borrowing capacity and is capped by reserve liquidity.";
      case "repay":
        return "MAX submits uint256.max so the pool repays all live debt, including newly accrued interest.";
    }
  })();

  const isPending =
    step === "approving"
      ? isApprovalPending || isApprovalConfirming
      : step === "executing"
        ? isActionPending || isActionConfirming
        : false;

  const visibleAllowanceError =
    needsApproval && allowanceError ? getErrorMessage(allowanceError) : null;

  const visibleError = flowError ?? visibleAllowanceError;

  function handleSubmit() {
    if (step !== "input") return;
    if (!address) return;
    if (inputAmount === 0n) return;
    if (supplyExceedsWallet) return;
    if (needsApproval && !isAllowanceReady) return;

    setFlowError(null);
    setSubmittedRequest({
      amount: inputAmount,
      maxMode,
    });

    if (needsApproval && !isApproved) {
      approvalObservedPendingRef.current = false;
      setStep("approving");

      try {
        sendApproval();
      } catch (error) {
        setFlowError(getErrorMessage(error));
        setSubmittedRequest(null);
        setStep("input");
      }

      return;
    }

    actionObservedPendingRef.current = false;
    setStep("executing");

    try {
      executeAction();
    } catch (error) {
      setFlowError(getErrorMessage(error));
      setSubmittedRequest(null);
      setStep("input");
    }
  }

  function handleClose() {
    if (isProcessing) return;

    approvalObservedPendingRef.current = false;
    actionObservedPendingRef.current = false;
    setRawInput("");
    setMaxMode("none");
    setStep("input");
    setSubmittedRequest(null);
    setFlowError(null);
    onClose();
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value;

    if (!isValidAmountInput(nextValue, assetDecimals)) {
      return;
    }

    setRawInput(nextValue);
    setMaxMode("none");
    setFlowError(null);
  }

  function handleMaxClick() {
    if (isProcessing || maxAmountBig === null) return;

    setRawInput(maxAmount ?? "0");
    setFlowError(null);

    if (action === "repay" && maxAmountBig > 0n) {
      setMaxMode("repayAll");
      return;
    }

    if (
      action === "withdraw" &&
      userReserveData &&
      userReserveData.collateralAmount > 0n &&
      maxAmountBig === userReserveData.collateralAmount
    ) {
      setMaxMode("withdrawAll");
      return;
    }

    setMaxMode("none");
  }

  function getButtonLabel(): string {
    if (step === "done") return "Transaction complete";

    if (step === "approving") {
      return isApprovalConfirming
        ? "Confirming approval..."
        : "Approving unlimited allowance...";
    }

    if (step === "executing") {
      return isActionConfirming ? "Confirming transaction..." : "Submitting...";
    }

    if (!address) return "Connect wallet first";
    if (supplyExceedsWallet) return "Insufficient wallet balance";
    if (visibleAllowanceError) return "Allowance unavailable";
    if (needsApproval && !isAllowanceReady) return "Checking allowance...";
    if (!isApproved) return `Approve ${assetSymbol}`;

    return `${LABEL[action]} ${assetSymbol}`;
  }

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
            type="button"
            onClick={handleClose}
            disabled={isProcessing}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
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
              Transaction confirmed successfully.
            </p>

            <button
              type="button"
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
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={rawInput}
                disabled={isProcessing}
                onChange={handleInputChange}
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-lg font-semibold text-slate-50 outline-none placeholder:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
              />

              <div className="flex items-center gap-2 pr-4">
                {maxAmountBig !== null && (
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleMaxClick}
                    className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-300 transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    MAX
                  </button>
                )}

                <span className="text-sm font-medium text-slate-400">
                  {assetSymbol}
                </span>
              </div>
            </div>

            {maxAmountBig !== null && (
              <p className="mb-3 text-xs text-slate-500">{maxHint}</p>
            )}

            <div className="mb-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Health factor</span>
                <span>Before - After</span>
              </div>

              <div className="mt-2 flex items-center justify-between text-sm font-semibold">
                <span className="text-slate-100">
                  {formatHealthFactor(accountData?.healthFactorWad)}
                </span>
                <span className="text-slate-500">to</span>
                <span className="text-cyan-300">Updates on-chain</span>
              </div>
            </div>

            {needsApproval &&
              inputAmount > 0n &&
              isAllowanceReady &&
              !isApproved && (
                <div className="mb-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                  The first approval grants the pool a reusable unlimited
                  allowance, so later supply and repay transactions can skip
                  this step.
                </div>
              )}

            {supplyExceedsWallet && (
              <div className="mb-3 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">
                Amount is greater than your wallet balance.
              </div>
            )}

            {visibleError && (
              <div className="mb-3 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">
                {visibleError}
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                step !== "input" ||
                inputAmount === 0n ||
                !address ||
                supplyExceedsWallet ||
                (needsApproval && !isAllowanceReady)
              }
              className={`mt-3 w-full rounded-lg py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${ACTION_COLOR[action]}`}
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {getButtonLabel()}
                </span>
              ) : (
                getButtonLabel()
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
