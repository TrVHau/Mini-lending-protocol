// Purpose:
// - Doc danh sach reserve/market de render bang thi truong.
// Input:
// - Khong can input (lay tu LendingPool).
// Guard:
// - Chi query khi contract address co san.
// Contract:
// - LendingPool.getReserveList().
// Transform:
// - Map danh sach asset thanh object market cho UI de map.
// Return:
// - { reserves, isLoading, error }

import { useReadContract } from "wagmi";
import { LENDING_POOL_ADDRESS, LENDING_POOL_ABI } from "../../config/contracts";
import { useMemo } from "react";

// address[] getReserveList();
type Reserves = `0x${string}`[];

function useReserves() {
  const { data, isLoading, error } = useReadContract({
    address: LENDING_POOL_ADDRESS,
    abi: LENDING_POOL_ABI,
    functionName: "getReserveList",
  });

  const reserves = useMemo(() => {
    if (!data) return undefined;
    return data as Reserves;
  }, [data]);

  return { reserves, isLoading, error };
}

export default useReserves;
