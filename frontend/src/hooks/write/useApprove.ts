// Purpose:
// - Tao transaction approve ERC20 cho spender, thuong la LendingPool.
// Input:
// - tokenAddress, spenderAddress, amount.
// Guard:
// - Chi goi write khi du input va amount > 0.
// Contract:
// - ERC20.approve(spender, amount).
// Transform:
// - Theo doi hash va trang thai confirm transaction.
// - Invalidate all query caches on success so allowance reads refetch.
// Return:
// - { approve, canApprove, hash, isPending, isConfirming, isSuccess, error }

import { useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ERC20_ABI } from "../../config/contracts";
import useInvalidateQueries from "../useInvalidateQueries";

function useApprove(
  tokenAddress: `0x${string}` | null | undefined,
  spenderAddress: `0x${string}` | null | undefined,
  amount: bigint | null | undefined,
) {
  const invalidate = useInvalidateQueries();
  const approveTx = useWriteContract();

  const hash = approveTx.data;

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

  const canApprove =
    !!tokenAddress &&
    !!spenderAddress &&
    amount !== null &&
    amount !== undefined &&
    amount > 0n;

  function approve() {
    if (!canApprove) return;

    approveTx.mutate({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spenderAddress, amount],
    });
  }

  return {
    approve,
    canApprove,
    hash,
    isPending: approveTx.isPending,
    isConfirming,
    isSuccess,
    error: approveTx.error || confirmError,
  };
}

export default useApprove;
