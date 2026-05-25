// Purpose:
// - Tao transaction nap tai san vao LendingPool.
// Input:
// - assetAddress, amount.
// Guard:
// - Chi goi write khi amount > 0, da ket noi vi, va da approve neu can.
// Contract:
// - LendingPool.deposit(asset, amount).
// Transform:
// - Theo doi hash va trang thai confirm transaction.
// Return:
// - { deposit, hash, isPending, isSuccess, error }

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { LENDING_POOL_ADDRESS, LENDING_POOL_ABI } from "../../config/contracts";

function useDeposit(
  assetAddress: `0x${string}` | null | undefined,
  amount: bigint | null | undefined,
) {
  const depositTx = useWriteContract();

  const hash = depositTx.data;

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

  const canDeposit =
    !!assetAddress && amount !== null && amount !== undefined && amount > 0n;

  function deposit() {
    if (!canDeposit) return;

    depositTx.mutate({
      address: LENDING_POOL_ADDRESS,
      abi: LENDING_POOL_ABI,
      functionName: "deposit",
      args: [assetAddress, amount],
    });
  }

  return {
    deposit,
    canDeposit,
    hash,
    isPending: depositTx.isPending,
    isConfirming,
    isSuccess,
    error: depositTx.error || confirmError,
  };
}

export default useDeposit;
