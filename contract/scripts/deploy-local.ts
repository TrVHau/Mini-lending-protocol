import { ethers } from "hardhat";

async function main() {
  const [deployer, user] = await ethers.getSigners();

  // ── Oracle ────────────────────────────────────────────────────────────────
  const Oracle = await ethers.getContractFactory("MockPriceOracle");
  const oracle = await Oracle.deploy(deployer.address);
  await oracle.waitForDeployment();

  // ── Core Pool ─────────────────────────────────────────────────────────────
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const pool = await LendingPool.deploy(oracle.target, deployer.address);
  await pool.waitForDeployment();

  // ── Interest Rate Strategy ────────────────────────────────────────────────
  // Jump-rate model: base=0%, slope1=4%, slope2=75% annual, Uopt=80%
  const Strategy = await ethers.getContractFactory(
    "DefaultInterestRateStrategy",
  );
  const strategy = await Strategy.deploy(
    0, // baseRateWad: 0%
    ethers.parseUnits("0.04", 18), // slope1Wad:   4% annual
    ethers.parseUnits("0.75", 18), // slope2Wad:   75% annual (jump)
    ethers.parseUnits("0.8", 27), // optimalUtilizationRay: 80%
  );
  await strategy.waitForDeployment();

  // ── Underlying Tokens ─────────────────────────────────────────────────────
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const weth = await MockERC20.deploy("Wrapped Ether", "WETH", 18);
  const dai = await MockERC20.deploy("Dai Stablecoin", "DAI", 18);
  await weth.waitForDeployment();
  await dai.waitForDeployment();

  // ── aTokens & Debt Tokens ─────────────────────────────────────────────────
  const AToken = await ethers.getContractFactory("AToken");
  const VariableDebtToken =
    await ethers.getContractFactory("VariableDebtToken");

  const aWETH = await AToken.deploy(pool.target, weth.target, 18);
  const dWETH = await VariableDebtToken.deploy(pool.target, weth.target, 18);
  await aWETH.waitForDeployment();
  await dWETH.waitForDeployment();

  const aDAI = await AToken.deploy(pool.target, dai.target, 18);
  const dDAI = await VariableDebtToken.deploy(pool.target, dai.target, 18);
  await aDAI.waitForDeployment();
  await dDAI.waitForDeployment();

  // Initialize Reserves
  await pool.initReserve(
    weth.target, // asset
    aWETH.target, // aToken
    dWETH.target, // debtToken
    strategy.target, // interestRateStrategy
    18, // assetDecimals
    7500, // ltvBps          = 75%
    8000, // liquidationThresholdBps = 80%
    10500, // liquidationBonusBps = 105% (5% bonus)
    1000, // reserveFactorBps = 10%
  );

  await pool.initReserve(
    dai.target,
    aDAI.target,
    dDAI.target,
    strategy.target,
    18,
    8000, // ltv 80%
    8500, // liq threshold 85%
    10500, // bonus 5%
    1000, // reserve factor 10%
  );

  // Oracle Prices
  await oracle.setPrice(weth.target, ethers.parseUnits("2000", 8)); // $2 000
  await oracle.setPrice(dai.target, ethers.parseUnits("1", 8)); // $1

  // send deployer some WETH and DAI to deposit into the pool
  await weth.mint(deployer.address, ethers.parseUnits("100", 18));
  await dai.mint(deployer.address, ethers.parseUnits("100000", 18));

  // Approve LendingPool to spend deployer's WETH and DAI
  await weth.approve(pool.target, ethers.parseUnits("100", 18));
  await dai.approve(pool.target, ethers.parseUnits("100000", 18));

  // Deposit WETH and DAI into the pool
  await pool.deposit(weth.target, ethers.parseUnits("100", 18));
  await pool.deposit(dai.target, ethers.parseUnits("100000", 18));

  // Seed User Balances
  await weth.mint(user.address, ethers.parseUnits("10", 18));
  await dai.mint(user.address, ethers.parseUnits("10000", 18));

  //  Summary
  console.log("Deployer:          ", deployer.address);
  console.log("User:              ", user.address);
  console.log("Oracle:            ", oracle.target);
  console.log("LendingPool:       ", pool.target);
  console.log("InterestStrategy:  ", strategy.target);
  console.log("WETH:              ", weth.target);
  console.log("  aWETH:           ", aWETH.target);
  console.log("  dWETH:           ", dWETH.target);
  console.log("DAI:               ", dai.target);
  console.log("  aDAI:            ", aDAI.target);
  console.log("  dDAI:            ", dDAI.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
