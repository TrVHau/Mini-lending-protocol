import lendingPoolArtifact from "../abi/LendingPool.json";
import aTokenArtifact from "../abi/AToken.json";
import variableDebtTokenArtifact from "../abi/VariableDebtToken.json";
import mockErc20Artifact from "../abi/MockERC20.json";
import PriceOracleArtifact from "../abi/PriceOracle.json";
import type { Abi } from "viem";

export const LENDING_POOL_ADDRESS =
  "0x3e6003FF2dEC428a7397D346e3fE4e6829b88fC2" as const;

export const LENDING_POOL_ABI = lendingPoolArtifact.abi as Abi;
export const ATOKEN_ABI = aTokenArtifact.abi as Abi;
export const VARIABLE_DEBT_TOKEN_ABI = variableDebtTokenArtifact.abi as Abi;
export const ERC20_ABI = mockErc20Artifact.abi as Abi;
export const PRICE_ORACLE_ABI = PriceOracleArtifact.abi as Abi;
