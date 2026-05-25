// Purpose:
// - Tao transaction liquidate vi the co health factor thap.
// Input:
// - collateralAsset, debtAsset, userAddress, debtToCover.
// Guard:
// - Chi goi write khi du input va debtToCover > 0.
// Contract:
// - LendingPool.liquidate(collateralAsset, debtAsset, user, debtToCover).
// Transform:
// - Theo doi hash va trang thai confirm transaction.
// Return:
// - { liquidate, hash, isPending, isSuccess, error }

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { LENDING_POOL_ADDRESS, LENDING_POOL_ABI } from "../../config/contracts";

function useLiquidate(
  collateralAsset: `0x${string}` | null | undefined,
  debtAsset: `0x${string}` | null | undefined,
  userAddress: `0x${string}` | null | undefined,
  debtToCover: bigint | null | undefined,
) {
  const liquidateTx = useWriteContract();

  const hash = liquidateTx.data;

  const {
    isLoading: isConfirming,
    isSuccess,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash,
    query: {
      enabled: !!hash,
    },
  });

  const canLiquidate =
    !!collateralAsset &&
    !!debtAsset &&
    !!userAddress &&
    debtToCover !== null &&
    debtToCover !== undefined &&
    debtToCover > 0n;

  function liquidate() {
    if (!canLiquidate) return;

    liquidateTx.mutate({
      address: LENDING_POOL_ADDRESS,
      abi: LENDING_POOL_ABI,
      functionName: "liquidate",
      args: [collateralAsset, debtAsset, userAddress, debtToCover],
    });
  }

  return {
    liquidate,
    canLiquidate,
    hash,
    isPending: liquidateTx.isPending,
    isConfirming,
    isSuccess,
    error: liquidateTx.error || confirmError,
  };
}

export default useLiquidate;
