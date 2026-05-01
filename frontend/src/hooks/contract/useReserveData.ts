// Purpose:
// - Lay dia chi aToken va debtToken cua mot reserve asset.
// Input:
// - reserveAddress: dia chi asset trong LendingPool.
// Guard:
// - Chi goi contract khi reserveAddress ton tai (enabled = !!reserveAddress).
// Contract:
// - LendingPool.getReserveAddresses(asset).
// Transform:
// - Map tuple [aToken, debtToken] thanh object co ten field ro rang.
// Return:
// - { aTokenAddress, debtTokenAddress, isLoading, error }
import { useReadContract } from "wagmi";
import { LENDING_POOL_ADDRESS, LENDING_POOL_ABI } from "../../config/contracts";

function useReserveData(reserveAddress: string) {
  const { data, isLoading, error } = useReadContract({
    address: LENDING_POOL_ADDRESS,
    abi: LENDING_POOL_ABI,
    functionName: "getReserveAddresses",
    args: [reserveAddress as `0x${string}`],
    query: {
      enabled: !!reserveAddress,
    },
  });

  const reserveData = data as
    | readonly [`0x${string}`, `0x${string}`]
    | undefined;
  const aTokenAddress = reserveData ? reserveData[0] : null;
  const debtTokenAddress = reserveData ? reserveData[1] : null;

  return {
    aTokenAddress,
    debtTokenAddress,
    isLoading,
    error,
  };
}

export default useReserveData;
