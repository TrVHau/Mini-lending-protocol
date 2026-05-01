// Purpose:
// - Lay health factor cua user de hien thi muc do an toan cua vi the vay.
// Input:
// - userAddress: dia chi vi can truy van.
// Guard:
// - Chi goi contract khi userAddress ton tai (enabled = !!userAddress).
// Contract:
// - LendingPool.getHealthFactor(userAddress).
// Transform:
// - Chuyen undefined thanh null de component de xu ly trang thai chua co du lieu.
// Return:
// - { healthFactor, isLoading, error }
import { useReadContract } from "wagmi";
import { LENDING_POOL_ADDRESS, LENDING_POOL_ABI } from "../../config/contracts";

function useHealthFactor(userAddress: string | undefined) {
  const { data, isLoading, error } = useReadContract({
    address: LENDING_POOL_ADDRESS,
    abi: LENDING_POOL_ABI,
    functionName: "getHealthFactor",
    args: [userAddress || "0x"],
    query: {
      enabled: !!userAddress,
    },
  });

  return {
    healthFactor: data ?? null,
    isLoading,
    error,
  };
}

export default useHealthFactor;
