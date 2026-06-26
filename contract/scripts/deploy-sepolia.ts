import { ethers } from "hardhat";

const FEEDS = {
  ETH_USD: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
  DAI_USD: "0x14866185B1962B63C3Ea9E03Bc1da838bab34C19",
  BTC_USD: "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43",
  LINK_USD: "0xc59E3633BAAC79493d908e63626716e204A45EdF",
  XAU_USD: "0xC5981F461d74c46eB4b0CF3f4Ec79f025573B0Ea",
} as const;

async function waitTx(txPromise: Promise<any>) {
  const tx = await txPromise;
  await tx.wait();
}

async function main() {
  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    throw new Error("Missing deployer account");
  }

  console.log("Deploying with:", deployer.address);

  // Oracle
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const oracle = await PriceOracle.deploy();
  await oracle.waitForDeployment();

  await waitTx(oracle.setMaxPriceAge(7 * 24 * 60 * 60)); // 7 days

  // Lending Pool
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const pool = await LendingPool.deploy(
    await oracle.getAddress(),
    deployer.address,
  );
  await pool.waitForDeployment();

  // Interest Rate Strategy
  const Strategy = await ethers.getContractFactory(
    "DefaultInterestRateStrategy",
  );

  const strategy = await Strategy.deploy(
    0n,
    ethers.parseUnits("0.04", 18),
    ethers.parseUnits("0.75", 18),
    ethers.parseUnits("0.8", 27),
  );
  await strategy.waitForDeployment();

  const poolAddress = await pool.getAddress();
  const strategyAddress = await strategy.getAddress();

  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const AToken = await ethers.getContractFactory("AToken");
  const VariableDebtToken = await ethers.getContractFactory(
    "VariableDebtToken",
  );

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
  }) {
    const token = await MockERC20.deploy(
      config.name,
      config.symbol,
      config.decimals,
    );
    await token.waitForDeployment();

    const tokenAddress = await token.getAddress();

    const aToken = await AToken.deploy(
      poolAddress,
      tokenAddress,
      config.decimals,
    );
    await aToken.waitForDeployment();

    const debtToken = await VariableDebtToken.deploy(
      poolAddress,
      tokenAddress,
      config.decimals,
    );
    await debtToken.waitForDeployment();

    const aTokenAddress = await aToken.getAddress();
    const debtTokenAddress = await debtToken.getAddress();

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
      ),
    );

    await waitTx(oracle.setPriceFeed(tokenAddress, config.priceFeed));

    const mintAmount = ethers.parseUnits(config.mintAmount, config.decimals);

    const depositAmount = ethers.parseUnits(
      config.depositAmount,
      config.decimals,
    );

    await waitTx(token.mint(deployer.address, mintAmount));

    await waitTx(token.approve(poolAddress, depositAmount));

    await waitTx(pool.deposit(tokenAddress, depositAmount));

    console.log(`${config.symbol}:`, tokenAddress);
    console.log(`a${config.symbol}:`, aTokenAddress);
    console.log(`d${config.symbol}:`, debtTokenAddress);

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

  console.log("\n=== DEPLOYED CONTRACTS ===");
  console.log("Oracle:", await oracle.getAddress());
  console.log("LendingPool:", poolAddress);
  console.log("InterestStrategy:", strategyAddress);
  console.log("WETH:", weth);
  console.log("DAI:", dai);
  console.log("BTC:", btc);
  console.log("LINK:", link);
  console.log("XAU:", xau);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
