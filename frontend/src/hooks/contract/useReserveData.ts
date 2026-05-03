// Purpose:
// - Doc du lieu reserve theo asset (aToken, debtToken, LTV, indexes, v.v.).
// Input:
// - reserveAddress: dia chi asset trong LendingPool.
// Guard:
// - Chi goi contract khi reserveAddress ton tai (enabled = !!reserveAddress).
// Contract:
// - LendingPool.getReserveData(asset).
// Transform:
// - Map tuple thanh object co field ro rang cho UI.
// Return:
// - { reserveData, isLoading, error }

import { useReadContract } from "wagmi";
import { LENDING_POOL_ADDRESS, LENDING_POOL_ABI } from "../../config/contracts";
import { useMemo } from "react";
// address aToken,
// address debtToken,
// uint8 assetDecimals,
// bool isActive,
// bool isFrozen,
// uint16 ltvBps,
// uint16 liquidationThresholdBps,
// uint16 liquidationBonusBps,
// uint16 reserveFactorBps,
// uint256 liquidityIndexRay,
// uint256 borrowIndexRay,
// uint40 lastUpdateTimestamp
type ReserveData = {
  aToken: `0x${string}`;
  debtToken: `0x${string}`;
  assetDecimals: bigint;
  isActive: boolean;
  isFrozen: boolean;
  ltvBps: bigint;
  liquidationThresholdBps: bigint;
  liquidationBonusBps: bigint;
  reserveFactorBps: bigint;
  liquidityIndexRay: bigint;
  borrowIndexRay: bigint;
  lastUpdateTimestamp: bigint;
};

function useReserveData(reserveAddress?: `0x${string}`) {
  const { data, isLoading, error } = useReadContract({
    address: LENDING_POOL_ADDRESS,
    abi: LENDING_POOL_ABI,
    functionName: "getReserveData",
    args: reserveAddress ? [reserveAddress] : undefined,
    query: { enabled: !!reserveAddress },
  });

  const reserveData = useMemo(() => {
    if (!data) return undefined;
    const [
      aToken,
      debtToken,
      assetDecimals,
      isActive,
      isFrozen,
      ltvBps,
      liquidationThresholdBps,
      liquidationBonusBps,
      reserveFactorBps,
      liquidityIndexRay,
      borrowIndexRay,
      lastUpdateTimestamp,
    ] = data as [
      `0x${string}`,
      `0x${string}`,
      bigint,
      boolean,
      boolean,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
    ];
    return {
      aToken,
      debtToken,
      assetDecimals,
      isActive,
      isFrozen,
      ltvBps,
      liquidationThresholdBps,
      liquidationBonusBps,
      reserveFactorBps,
      liquidityIndexRay,
      borrowIndexRay,
      lastUpdateTimestamp,
    } as ReserveData;
  }, [data]);

  return { reserveData, isLoading, error };
}

export default useReserveData;
