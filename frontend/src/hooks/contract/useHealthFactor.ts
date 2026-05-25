// Purpose:
// - Doc health factor cua user de hien thi muc do an toan vi the vay.
// Input:
// - userAddress: dia chi vi can truy van.
// Guard:
// - Chi goi contract khi userAddress ton tai (enabled = !!userAddress).
// Contract:
// - LendingPool.getHealthFactor(userAddress).
// Transform:
// - Chuyen undefined thanh null de UI de xu ly trang thai chua co du lieu.
// Return:
// - { healthFactor, isLoading, error }

import { useReadContract } from "wagmi";
import { LENDING_POOL_ADDRESS, LENDING_POOL_ABI } from "../../config/contracts";

function useHealthFactor(userAddress: `0x${string}` | null | undefined) {
  const { data, isLoading, error } = useReadContract({
    address: LENDING_POOL_ADDRESS,
    abi: LENDING_POOL_ABI,
    functionName: "getHealthFactor",
    args: [userAddress || "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!userAddress },
  });

  return { healthFactor: data ?? null, isLoading, error };
}

export default useHealthFactor;
