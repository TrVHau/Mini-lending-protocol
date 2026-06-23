import { ethers } from "hardhat";

async function main() {
  const [deployer, user, alice, bob, carol] = await ethers.getSigners();
  if (!deployer || !user || !alice || !bob || !carol) {
    throw new Error("deploy-local requires at least 5 local signers");
  }

  const unit = (value: string) => ethers.parseUnits(value, 18);
  const waitForTx = async (
    txPromise: Promise<{ wait: () => Promise<unknown> }>,
  ) => {
    const tx = await txPromise;
    await tx.wait();
  };

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
    unit("0.04"), // slope1Wad:   4% annual
    unit("0.75"), // slope2Wad:   75% annual (jump)
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
  await waitForTx(
    pool.initReserve(
      weth.target, // asset
      aWETH.target, // aToken
      dWETH.target, // debtToken
      strategy.target, // interestRateStrategy
      18, // assetDecimals
      7500, // ltvBps          = 75%
      8000, // liquidationThresholdBps = 80%
      10500, // liquidationBonusBps = 105% (5% bonus)
      1000, // reserveFactorBps = 10%
    ),
  );

  await waitForTx(
    pool.initReserve(
      dai.target,
      aDAI.target,
      dDAI.target,
      strategy.target,
      18,
      8000, // ltv 80%
      8500, // liq threshold 85%
      10500, // bonus 5%
      1000, // reserve factor 10%
    ),
  );

  // Oracle Prices
  await waitForTx(
    oracle.setPrice(weth.target, ethers.parseUnits("2000", 8)),
  ); // $2 000
  await waitForTx(oracle.setPrice(dai.target, ethers.parseUnits("1", 8))); // $1

  // send deployer some WETH and DAI to deposit into the pool
  await waitForTx(weth.mint(deployer.address, unit("100")));
  await waitForTx(dai.mint(deployer.address, unit("100000")));

  // Approve LendingPool to spend deployer's WETH and DAI
  await waitForTx(weth.approve(pool.target, unit("100")));
  await waitForTx(dai.approve(pool.target, unit("100000")));

  // Deposit WETH and DAI into the pool
  await waitForTx(pool.deposit(weth.target, unit("100")));
  await waitForTx(pool.deposit(dai.target, unit("100000")));

  // ── Seed market participants ──────────────────────────────────────────────
  // These positions make the local market feel closer to Aave: multiple
  // suppliers, cross-asset borrowing, and one partial repay.
  await waitForTx(weth.mint(user.address, unit("10")));
  await waitForTx(dai.mint(user.address, unit("10000")));
  await waitForTx(weth.mint(alice.address, unit("2")));
  await waitForTx(dai.mint(alice.address, unit("25000")));
  await waitForTx(weth.mint(bob.address, unit("8")));
  await waitForTx(dai.mint(bob.address, unit("2000")));
  await waitForTx(weth.mint(carol.address, unit("1")));
  await waitForTx(dai.mint(carol.address, unit("12000")));

  // User supplies WETH, borrows DAI, then repays a small part of the debt.
  await waitForTx(weth.connect(user).approve(pool.target, unit("5")));
  await waitForTx(pool.connect(user).deposit(weth.target, unit("5")));
  await waitForTx(pool.connect(user).borrow(dai.target, unit("3000")));
  await waitForTx(dai.connect(user).approve(pool.target, unit("250")));
  await waitForTx(pool.connect(user).repay(dai.target, unit("250")));

  // Alice supplies DAI and borrows WETH.
  await waitForTx(dai.connect(alice).approve(pool.target, unit("20000")));
  await waitForTx(pool.connect(alice).deposit(dai.target, unit("20000")));
  await waitForTx(pool.connect(alice).borrow(weth.target, unit("2")));

  // Bob supplies WETH and borrows DAI.
  await waitForTx(weth.connect(bob).approve(pool.target, unit("3")));
  await waitForTx(pool.connect(bob).deposit(weth.target, unit("3")));
  await waitForTx(pool.connect(bob).borrow(dai.target, unit("2500")));

  // Carol supplies DAI and borrows WETH.
  await waitForTx(dai.connect(carol).approve(pool.target, unit("8000")));
  await waitForTx(pool.connect(carol).deposit(dai.target, unit("8000")));
  await waitForTx(pool.connect(carol).borrow(weth.target, unit("1")));

  //  Summary
  console.log("Deployer:          ", deployer.address);
  console.log("User:              ", user.address);
  console.log("Alice:             ", alice.address);
  console.log("Bob:               ", bob.address);
  console.log("Carol:             ", carol.address);
  console.log("Oracle:            ", oracle.target);
  console.log("LendingPool:       ", pool.target);
  console.log("InterestStrategy:  ", strategy.target);
  console.log("WETH:              ", weth.target);
  console.log("  aWETH:           ", aWETH.target);
  console.log("  dWETH:           ", dWETH.target);
  console.log("DAI:               ", dai.target);
  console.log("  aDAI:            ", aDAI.target);
  console.log("  dDAI:            ", dDAI.target);
  console.log("Seeded market:     ", "4 user positions + 1 partial repay");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
