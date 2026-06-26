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
// - Invalidate all query caches on success so UI data refetches.
// Return:
// - { liquidate, hash, isPending, isSuccess, error }

import { useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { LENDING_POOL_ADDRESS, LENDING_POOL_ABI } from "../../config/contracts";
import useInvalidateQueries from "../useInvalidateQueries";

function useLiquidate(
  collateralAsset: `0x${string}` | null | undefined,
  debtAsset: `0x${string}` | null | undefined,
  userAddress: `0x${string}` | null | undefined,
  debtToCover: bigint | null | undefined,
) {
  const invalidate = useInvalidateQueries();
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

  useEffect(() => {
    if (isSuccess) invalidate();
  }, [isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

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
