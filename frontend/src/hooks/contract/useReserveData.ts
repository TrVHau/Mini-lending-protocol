import { useReadContract } from "wagmi";
import { LENDING_POOL_ADDRESS, LENDING_POOL_ABI } from "../../config/contracts";
import { useMemo } from "react";

const RAY = 1e27;
const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;

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
  supplyAPY: number;
  borrowAPY: number;
};

function rayPerSecondToApy(rateRayPerSecond: bigint): number {
  return (Number(rateRayPerSecond) * SECONDS_PER_YEAR * 100) / RAY;
}

function useReserveData(reserveAddress?: `0x${string}`) {
  const reserveQuery = useReadContract({
    address: LENDING_POOL_ADDRESS,
    abi: LENDING_POOL_ABI,
    functionName: "getReserveData",
    args: reserveAddress ? [reserveAddress] : undefined,
    query: { enabled: !!reserveAddress },
  });

  const ratesQuery = useReadContract({
    address: LENDING_POOL_ADDRESS,
    abi: LENDING_POOL_ABI,
    functionName: "getReserveRates",
    args: reserveAddress ? [reserveAddress] : undefined,
    query: { enabled: !!reserveAddress },
  });

  const reserveData = useMemo(() => {
    if (!reserveQuery.data) return undefined;
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
    ] = reserveQuery.data as [
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
    const [liquidityRateRayPerSecond, borrowRateRayPerSecond] =
      (ratesQuery.data as [bigint, bigint] | undefined) ?? [0n, 0n];

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
      supplyAPY: rayPerSecondToApy(liquidityRateRayPerSecond),
      borrowAPY: rayPerSecondToApy(borrowRateRayPerSecond),
    } as ReserveData;
  }, [reserveQuery.data, ratesQuery.data]);

  return {
    reserveData,
    isLoading: reserveQuery.isLoading || ratesQuery.isLoading,
    error: reserveQuery.error || ratesQuery.error,
  };
}

export default useReserveData;
