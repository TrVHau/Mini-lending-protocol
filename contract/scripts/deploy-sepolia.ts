import * as fs from "fs";
import * as path from "path";
import { ethers } from "hardhat";

const FEEDS = {
  ETH_USD: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
  DAI_USD: "0x14866185B1962B63C3Ea9E03Bc1da838bab34C19",
  BTC_USD: "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43",
  LINK_USD: "0xc59E3633BAAC79493d908e63626716e204A45EdF",
  XAU_USD: "0xC5981F461d74c46eB4b0CF3f4Ec79f025573B0Ea",
} as const;

const EXISTING_ORACLE = "0x2a2a97ddEe101f11E4924eb1Bb2Ece75A81a8773";
const EXISTING_POOL = "0x41bCaF5D5083Dc3338488e15262b1EDA9FC6e2e2";
const EXISTING_STRATEGY = "0x7fd95b243A55916f9F033aF6270058c24C4299f2";
const EXISTING_WETH_TOKEN = "0x089483A63794a0f036918C31D49F7b0eE9321B65";

// Custom fee override for low-cost Sepolia deployment
const feeOverride = {
  maxFeePerGas: ethers.parseUnits("0.02", "gwei"),
  maxPriorityFeePerGas: ethers.parseUnits("0.002", "gwei"),
};

async function waitTx(txPromise: Promise<any>, stepDescription?: string) {
  if (stepDescription) {
    process.stdout.write(`  -> ${stepDescription}... `);
  }
  const tx = await txPromise;
  const receipt = await tx.wait();
  if (stepDescription) {
    console.log(`done (tx: ${receipt.hash.slice(0, 10)}...)`);
  }
  return receipt;
}

async function main() {
  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    throw new Error("Missing deployer account");
  }

  console.log("=========================================");
  console.log("Deploying to Sepolia with:", deployer.address);
  const startBalance = await ethers.provider.getBalance(deployer.address);
  console.log("Starting balance:", ethers.formatEther(startBalance), "ETH");
  console.log("=========================================\n");

  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const Strategy = await ethers.getContractFactory("DefaultInterestRateStrategy");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const AToken = await ethers.getContractFactory("AToken");
  const VariableDebtToken = await ethers.getContractFactory("VariableDebtToken");

  // 1. Oracle
  let oracle;
  const oracleCode = await ethers.provider.getCode(EXISTING_ORACLE);
  if (oracleCode && oracleCode.length > 2) {
    console.log("1. Reusing existing PriceOracle at:", EXISTING_ORACLE);
    oracle = PriceOracle.attach(EXISTING_ORACLE);
  } else {
    console.log("1. Deploying PriceOracle...");
    oracle = await PriceOracle.deploy(feeOverride);
    await oracle.waitForDeployment();
    console.log("   PriceOracle deployed at:", await oracle.getAddress());
    await waitTx(oracle.setMaxPriceAge(7 * 24 * 60 * 60, feeOverride), "Setting oracle maxPriceAge (7 days)");
  }
  const oracleAddress = await oracle.getAddress();

  // 2. Lending Pool
  let pool;
  const poolCode = await ethers.provider.getCode(EXISTING_POOL);
  if (poolCode && poolCode.length > 2) {
    console.log("2. Reusing existing LendingPool at:", EXISTING_POOL);
    pool = LendingPool.attach(EXISTING_POOL);
  } else {
    console.log("2. Deploying LendingPool...");
    pool = await LendingPool.deploy(oracleAddress, deployer.address, feeOverride);
    await pool.waitForDeployment();
    console.log("   LendingPool deployed at:", await pool.getAddress());
  }
  const poolAddress = await pool.getAddress();

  // 3. Interest Strategy
  let strategy;
  const strategyCode = await ethers.provider.getCode(EXISTING_STRATEGY);
  if (strategyCode && strategyCode.length > 2) {
    console.log("3. Reusing existing Strategy at:", EXISTING_STRATEGY);
    strategy = Strategy.attach(EXISTING_STRATEGY);
  } else {
    console.log("3. Deploying DefaultInterestRateStrategy...");
    strategy = await Strategy.deploy(
      0n,
      ethers.parseUnits("0.04", 18),
      ethers.parseUnits("0.75", 18),
      ethers.parseUnits("0.8", 27),
      feeOverride
    );
    await strategy.waitForDeployment();
    console.log("   DefaultInterestRateStrategy deployed at:", await strategy.getAddress());
  }
  const strategyAddress = await strategy.getAddress();

  async function deployReserve(config: {
    name: string;
    symbol: string;
    decimals: number;
    priceFeed: string;
    ltvBps: number;
    liquidationThresholdBps: number;
    liquidationBonusBps: number;
    reserveFactorBps: number;
    mintAmount: string;
    depositAmount: string;
    existingTokenAddress?: string;
  }) {
    console.log(`\n--- Configuring Reserve: ${config.symbol} (${config.name}) ---`);

    let token;
    let tokenAddress: string;

    if (config.existingTokenAddress) {
      const code = await ethers.provider.getCode(config.existingTokenAddress);
      if (code && code.length > 2) {
        console.log(`  Reusing existing ${config.symbol} token at: ${config.existingTokenAddress}`);
        token = MockERC20.attach(config.existingTokenAddress);
        tokenAddress = config.existingTokenAddress;
      } else {
        process.stdout.write(`  Deploying ${config.symbol} token... `);
        token = await MockERC20.deploy(config.name, config.symbol, config.decimals, feeOverride);
        await token.waitForDeployment();
        tokenAddress = await token.getAddress();
        console.log(`done at ${tokenAddress}`);
      }
    } else {
      process.stdout.write(`  Deploying ${config.symbol} token... `);
      token = await MockERC20.deploy(config.name, config.symbol, config.decimals, feeOverride);
      await token.waitForDeployment();
      tokenAddress = await token.getAddress();
      console.log(`done at ${tokenAddress}`);
    }

    process.stdout.write(`  Deploying a${config.symbol}... `);
    const aToken = await AToken.deploy(poolAddress, tokenAddress, config.decimals, feeOverride);
    await aToken.waitForDeployment();
    const aTokenAddress = await aToken.getAddress();
    console.log(`done at ${aTokenAddress}`);

    process.stdout.write(`  Deploying d${config.symbol}... `);
    const debtToken = await VariableDebtToken.deploy(poolAddress, tokenAddress, config.decimals, feeOverride);
    await debtToken.waitForDeployment();
    const debtTokenAddress = await debtToken.getAddress();
    console.log(`done at ${debtTokenAddress}`);

    await waitTx(
      pool.initReserve(
        tokenAddress,
        aTokenAddress,
        debtTokenAddress,
        strategyAddress,
        config.decimals,
        config.ltvBps,
        config.liquidationThresholdBps,
        config.liquidationBonusBps,
        config.reserveFactorBps,
        feeOverride
      ),
      `Initializing reserve for ${config.symbol} on LendingPool`
    );

    await waitTx(
      oracle.setPriceFeed(tokenAddress, config.priceFeed, feeOverride),
      `Setting price feed for ${config.symbol} -> ${config.priceFeed}`
    );

    const mintAmount = ethers.parseUnits(config.mintAmount, config.decimals);
    const depositAmount = ethers.parseUnits(config.depositAmount, config.decimals);

    await waitTx(
      token.mint(deployer.address, mintAmount, feeOverride),
      `Minting ${config.mintAmount} ${config.symbol} to deployer`
    );

    await waitTx(
      token.approve(poolAddress, depositAmount, feeOverride),
      `Approving LendingPool to spend ${config.depositAmount} ${config.symbol}`
    );

    await waitTx(
      pool.deposit(tokenAddress, depositAmount, feeOverride),
      `Depositing ${config.depositAmount} ${config.symbol} into pool`
    );

    console.log(`  ✓ ${config.symbol} setup complete!`);

    return {
      token: tokenAddress,
      aToken: aTokenAddress,
      debtToken: debtTokenAddress,
    };
  }

  const weth = await deployReserve({
    name: "Wrapped Ether",
    symbol: "WETH",
    decimals: 18,
    priceFeed: FEEDS.ETH_USD,
    ltvBps: 7500,
    liquidationThresholdBps: 8000,
    liquidationBonusBps: 10500,
    reserveFactorBps: 1500,
    mintAmount: "120",
    depositAmount: "100",
    existingTokenAddress: EXISTING_WETH_TOKEN,
  });

  const dai = await deployReserve({
    name: "Dai Stablecoin",
    symbol: "DAI",
    decimals: 18,
    priceFeed: FEEDS.DAI_USD,
    ltvBps: 8000,
    liquidationThresholdBps: 8500,
    liquidationBonusBps: 10500,
    reserveFactorBps: 1000,
    mintAmount: "120000",
    depositAmount: "100000",
  });

  const btc = await deployReserve({
    name: "Bitcoin",
    symbol: "BTC",
    decimals: 8,
    priceFeed: FEEDS.BTC_USD,
    ltvBps: 7000,
    liquidationThresholdBps: 7500,
    liquidationBonusBps: 10500,
    reserveFactorBps: 2000,
    mintAmount: "12",
    depositAmount: "10",
  });

  const link = await deployReserve({
    name: "Chainlink",
    symbol: "LINK",
    decimals: 18,
    priceFeed: FEEDS.LINK_USD,
    ltvBps: 5000,
    liquidationThresholdBps: 6500,
    liquidationBonusBps: 11000,
    reserveFactorBps: 2000,
    mintAmount: "12000",
    depositAmount: "10000",
  });

  const xau = await deployReserve({
    name: "Gold",
    symbol: "XAU",
    decimals: 18,
    priceFeed: FEEDS.XAU_USD,
    ltvBps: 6500,
    liquidationThresholdBps: 7000,
    liquidationBonusBps: 10500,
    reserveFactorBps: 2000,
    mintAmount: "120",
    depositAmount: "100",
  });

  console.log("\n=========================================");
  console.log("=== DEPLOYED CONTRACTS ===");
  console.log("=========================================");
  console.log("Oracle:", oracleAddress);
  console.log("LendingPool:", poolAddress);
  console.log("InterestStrategy:", strategyAddress);
  console.log("WETH:", weth);
  console.log("DAI:", dai);
  console.log("BTC:", btc);
  console.log("LINK:", link);
  console.log("XAU:", xau);

  const deploySepoliaContent = `=== DEPLOYED CONTRACTS ===
Oracle: ${oracleAddress}
LendingPool: ${poolAddress}
InterestStrategy: ${strategyAddress}
WETH: {
  token: '${weth.token}',
  aToken: '${weth.aToken}',
  debtToken: '${weth.debtToken}'
}
DAI: {
  token: '${dai.token}',
  aToken: '${dai.aToken}',
  debtToken: '${dai.debtToken}'
}
BTC: {
  token: '${btc.token}',
  aToken: '${btc.aToken}',
  debtToken: '${btc.debtToken}'
}
LINK: {
  token: '${link.token}',
  aToken: '${link.aToken}',
  debtToken: '${link.debtToken}'
}
XAU: {
  token: '${xau.token}',
  aToken: '${xau.aToken}',
  debtToken: '${xau.debtToken}'
}
`;

  const deploySepoliaPath = path.resolve(__dirname, "../../frontend/src/config/deploy_sepolia.txt");
  fs.writeFileSync(deploySepoliaPath, deploySepoliaContent, "utf-8");
  console.log("\n✓ Updated frontend/src/config/deploy_sepolia.txt");

  const contractsTsPath = path.resolve(__dirname, "../../frontend/src/config/contracts.ts");
  let contractsTs = fs.readFileSync(contractsTsPath, "utf-8");
  contractsTs = contractsTs.replace(
    /export const LENDING_POOL_ADDRESS =\s*"0x[a-fA-F0-9]+"/,
    `export const LENDING_POOL_ADDRESS =\n  "${poolAddress}"`
  );
  fs.writeFileSync(contractsTsPath, contractsTs, "utf-8");
  console.log("✓ Updated LENDING_POOL_ADDRESS in frontend/src/config/contracts.ts");

  console.log("\nVerifying live oracle prices for deployed reserves...");
  for (const [sym, tokenAddr] of [
    ["WETH", weth.token],
    ["DAI", dai.token],
    ["BTC", btc.token],
    ["LINK", link.token],
    ["XAU", xau.token],
  ]) {
    const price = await oracle.getAssetPrice(tokenAddr);
    console.log(`  ${sym} price from oracle: $${ethers.formatUnits(price, 8)}`);
  }

  const endBalance = await ethers.provider.getBalance(deployer.address);
  console.log("\nEnding balance:", ethers.formatEther(endBalance), "ETH");
  console.log("Total gas spent in this session:", ethers.formatEther(startBalance - endBalance), "ETH");
  console.log("=========================================\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
