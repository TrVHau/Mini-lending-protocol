import lendingPoolArtifact from "../abi/LendingPool.json";
import aTokenArtifact from "../abi/AToken.json";
import variableDebtTokenArtifact from "../abi/VariableDebtToken.json";
import mockErc20Artifact from "../abi/MockERC20.json";
import mockPriceOracleArtifact from "../abi/MockPriceOracle.json";

export const LENDING_POOL_ADDRESS = "0x..." as const;

export const LENDING_POOL_ABI = lendingPoolArtifact.abi;
export const ATOKEN_ABI = aTokenArtifact.abi;
export const VARIABLE_DEBT_TOKEN_ABI = variableDebtTokenArtifact.abi;
export const ERC20_ABI = mockErc20Artifact.abi;
export const PRICE_ORACLE_ABI = mockPriceOracleArtifact.abi;
