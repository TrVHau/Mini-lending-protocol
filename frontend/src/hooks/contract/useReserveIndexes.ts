// Purpose:
// - Doc indexes cua reserve de tinh toan so du/no thuc te tu scaled balance.
// Input:
// - reserveAddress: dia chi asset trong LendingPool.
// Guard:
// - Chi goi contract khi reserveAddress ton tai (enabled = !!reserveAddress).
// Contract:
// - LendingPool.getReserveIndexes(asset).
// Transform:
// - Map tuple [liquidityIndex, borrowIndex, lastUpdateTimestamp] thanh object.
// Return:
// - { liquidityIndex, borrowIndex, lastUpdateTimestamp, isLoading, error }
import { useReadContract } from "wagmi";
import { LENDING_POOL_ADDRESS, LENDING_POOL_ABI } from "../../config/contracts";

function useReserveIndexes(reserveAddress: string) {
  const { data, isLoading, error } = useReadContract({
    address: LENDING_POOL_ADDRESS,
    abi: LENDING_POOL_ABI,
    functionName: "getReserveIndexes",
    args: [reserveAddress as `0x${string}`],
    query: {
      enabled: !!reserveAddress,
    },
  });

  const reserveIndexes = data as readonly [bigint, bigint, bigint] | undefined;
  const liquidityIndex = reserveIndexes ? reserveIndexes[0] : null;
  const borrowIndex = reserveIndexes ? reserveIndexes[1] : null;
  const lastUpdateTimestamp = reserveIndexes ? reserveIndexes[2] : null;

  return {
    liquidityIndex,
    borrowIndex,
    lastUpdateTimestamp,
    isLoading,
    error,
  };
}

export default useReserveIndexes;
