import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import {
  ATOKEN_ABI,
  ERC20_ABI,
  LENDING_POOL_ABI,
  LENDING_POOL_ADDRESS,
  VARIABLE_DEBT_TOKEN_ABI,
} from "../../config/contracts";

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
};

type ReserveDataMap = Record<`0x${string}`, ReserveData>;

type ReserveRates = {
  supplyAPY: number;
  borrowAPY: number;
};

type ReserveRatesMap = Record<`0x${string}`, ReserveRates>;

type ReserveDataTuple = [
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

type ReserveRatesTuple = [bigint, bigint];

type TokenMeta = {
  name: string;
  symbol: string;
};

type TokenMetaMap = Record<`0x${string}`, TokenMeta>;

type MarketStats = {
  availableLiquidity: bigint;
  totalDeposits: bigint;
  totalBorrowed: bigint;
};

type MarketStatsMap = Record<`0x${string}`, MarketStats>;

type ContractResult = {
  status: "success" | "failure";
  result?: unknown;
};

function rayPerSecondToApy(rateRayPerSecond: bigint): number {
  return (Number(rateRayPerSecond) * SECONDS_PER_YEAR * 100) / RAY;
}

function useMarketOverview() {
  const listQuery = useReadContract({
    address: LENDING_POOL_ADDRESS,
    abi: LENDING_POOL_ABI,
    functionName: "getReserveList",
  });

  const reserves = useMemo(() => {
    return (listQuery.data as `0x${string}`[] | undefined) ?? [];
  }, [listQuery.data]);

  const reserveDataQuery = useReadContracts({
    contracts: reserves.map((asset) => ({
      address: LENDING_POOL_ADDRESS,
      abi: LENDING_POOL_ABI,
      functionName: "getReserveData",
      args: [asset],
    })),
    query: { enabled: reserves.length > 0 },
  });

  const reserveRatesQuery = useReadContracts({
    contracts: reserves.map((asset) => ({
      address: LENDING_POOL_ADDRESS,
      abi: LENDING_POOL_ABI,
      functionName: "getReserveRates",
      args: [asset],
    })),
    query: { enabled: reserves.length > 0 },
  });

  const reserveDataByAsset = useMemo(() => {
    if (!reserveDataQuery.data) return undefined;
    const map: ReserveDataMap = {};

    const getReserveResult = (entry: unknown) => {
      const typed = entry as ContractResult;
      if (!typed || typed.status !== "success") return null;
      return typed.result as ReserveDataTuple;
    };

    reserveDataQuery.data.forEach((result, index) => {
      const asset = reserves[index];
      const tuple = getReserveResult(result);
      if (!asset || !tuple) return;
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
      ] = tuple;
      map[asset] = {
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
      };
    });

    return map;
  }, [reserveDataQuery.data, reserves]);

  const ratesByAsset = useMemo(() => {
    if (!reserveRatesQuery.data) return undefined;
    const map: ReserveRatesMap = {};

    const getRatesResult = (entry: unknown) => {
      const typed = entry as ContractResult;
      if (!typed || typed.status !== "success") return null;
      return typed.result as ReserveRatesTuple;
    };

    reserveRatesQuery.data.forEach((result, index) => {
      const asset = reserves[index];
      const tuple = getRatesResult(result);
      if (!asset || !tuple) return;
      const [liquidityRateRayPerSecond, borrowRateRayPerSecond] = tuple;
      map[asset] = {
        supplyAPY: rayPerSecondToApy(liquidityRateRayPerSecond),
        borrowAPY: rayPerSecondToApy(borrowRateRayPerSecond),
      };
    });

    return map;
  }, [reserveRatesQuery.data, reserves]);

  const metaCalls = useMemo(() => {
    if (!reserves.length) return [];
    return reserves.flatMap((asset) => [
      { address: asset, abi: ERC20_ABI, functionName: "symbol", args: [] },
      { address: asset, abi: ERC20_ABI, functionName: "name", args: [] },
    ]);
  }, [reserves]);

  const statsCallAssets = useMemo(() => {
    if (!reserves.length || !reserveDataByAsset) return [];
    return reserves.filter((asset) => {
      const reserve = reserveDataByAsset[asset];
      return !!reserve?.aToken && !!reserve?.debtToken;
    });
  }, [reserves, reserveDataByAsset]);

  const statsCalls = useMemo(() => {
    if (!statsCallAssets.length || !reserveDataByAsset) return [];
    return statsCallAssets.flatMap((asset) => {
      const reserve = reserveDataByAsset[asset];
      return [
        {
          address: asset,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [reserve.aToken],
        },
        {
          address: reserve.aToken,
          abi: ATOKEN_ABI,
          functionName: "totalSupplyWithIndex",
          args: [reserve.liquidityIndexRay],
        },
        {
          address: reserve.debtToken,
          abi: VARIABLE_DEBT_TOKEN_ABI,
          functionName: "totalSupplyWithIndex",
          args: [reserve.borrowIndexRay],
        },
      ];
    });
  }, [statsCallAssets, reserveDataByAsset]);

  const metaQuery = useReadContracts({
    contracts: metaCalls,
    query: { enabled: metaCalls.length > 0 },
  });

  const statsQuery = useReadContracts({
    contracts: statsCalls,
    query: { enabled: statsCalls.length > 0 },
  });

  const tokenMetaByAsset = useMemo(() => {
    if (!metaQuery.data || !reserves.length) return undefined;
    const map: TokenMetaMap = {};

    const getResult = (entry: unknown) => {
      const typed = entry as ContractResult;
      if (!typed || typed.status !== "success") return null;
      return typed.result as string;
    };

    for (let i = 0; i < reserves.length; i++) {
      const asset = reserves[i];
      const symbol = getResult(metaQuery.data[i * 2]);
      const name = getResult(metaQuery.data[i * 2 + 1]);
      if (!symbol || !name) continue;
      map[asset] = { symbol, name };
    }

    return map;
  }, [metaQuery.data, reserves]);

  const marketStatsByAsset = useMemo(() => {
    if (
      !statsQuery.data ||
      statsCallAssets.length === 0 ||
      !reserveDataByAsset
    ) {
      return undefined;
    }
    const map: MarketStatsMap = {};
    const getResult = (entry: unknown): bigint | null => {
      const typed = entry as ContractResult;
      if (
        !typed ||
        typed.status !== "success" ||
        typeof typed.result !== "bigint"
      ) {
        return null;
      }
      return typed.result;
    };
    for (let i = 0; i < statsCallAssets.length; i++) {
      const asset = statsCallAssets[i];
      if (!asset) {
        continue;
      }
      const reserve = reserveDataByAsset[asset];
      if (!reserve?.aToken) {
        continue;
      }
      const availableLiquidity = getResult(statsQuery.data[i * 3]);
      const totalDeposits = getResult(statsQuery.data[i * 3 + 1]);
      const totalBorrowed = getResult(statsQuery.data[i * 3 + 2]);
      if (
        availableLiquidity === null ||
        totalDeposits === null ||
        totalBorrowed === null
      ) {
        continue;
      }

      map[asset] = {
        availableLiquidity,
        totalDeposits,
        totalBorrowed,
      };
    }

    return map;
  }, [statsQuery.data, statsCallAssets, reserveDataByAsset]);

  const isLoading =
    listQuery.isLoading ||
    reserveDataQuery.isLoading ||
    reserveRatesQuery.isLoading ||
    metaQuery.isLoading ||
    statsQuery.isLoading;
  const error =
    listQuery.error ||
    reserveDataQuery.error ||
    reserveRatesQuery.error ||
    metaQuery.error ||
    statsQuery.error;

  return {
    reserves,
    reserveDataByAsset,
    ratesByAsset,
    tokenMetaByAsset,
    marketStatsByAsset,
    isLoading,
    error,
  };
}

export default useMarketOverview;
