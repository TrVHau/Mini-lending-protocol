import { expect } from "chai";
import { ethers } from "hardhat";

describe("LendingPool - accountData", function () {
  let owner: any;
  let bob: any;
  let alice: any;
  let asset: any;
  let oracle: any;
  let pool: any;
  let aToken: any;
  let debtToken: any;

  const DECIMALS = 8;
  const ONE = ethers.parseUnits("1", DECIMALS);
  const WAD = ethers.parseUnits("1", 18);

  beforeEach(async function () {
    [owner, bob, alice] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    asset = await MockERC20.deploy("Mock DAI", "DAI", DECIMALS);

    const MockPriceOracle = await ethers.getContractFactory("MockPriceOracle");
    oracle = await MockPriceOracle.deploy(await owner.getAddress());

    const LendingPool = await ethers.getContractFactory("LendingPool");
    pool = await LendingPool.deploy(
      await oracle.getAddress(),
      await owner.getAddress(),
    );

    const AToken = await ethers.getContractFactory("AToken");
    aToken = await AToken.deploy(
      await pool.getAddress(),
      await asset.getAddress(),
      DECIMALS,
    );

    const DebtToken = await ethers.getContractFactory("VariableDebtToken");
    debtToken = await DebtToken.deploy(
      await pool.getAddress(),
      await asset.getAddress(),
      DECIMALS,
    );

    await pool.initReserve(
      await asset.getAddress(),
      await aToken.getAddress(),
      await debtToken.getAddress(),
      DECIMALS,
      8000,
      8500,
      10500,
      1000,
    );

    await oracle.setPrice(await asset.getAddress(), ONE);
    await asset.mint(await bob.getAddress(), ethers.parseUnits("1000", DECIMALS));
    await asset.mint(
      await alice.getAddress(),
      ethers.parseUnits("1000", DECIMALS),
    );
  });

  async function setupLiquidity(amount: string) {
    const amt = ethers.parseUnits(amount, DECIMALS);
    await asset.connect(bob).approve(await pool.getAddress(), amt);
    await pool.connect(bob).deposit(await asset.getAddress(), amt);
  }

  async function setupAlicePosition(collateral: string, borrow: string) {
    const collateralAmt = ethers.parseUnits(collateral, DECIMALS);
    const borrowAmt = ethers.parseUnits(borrow, DECIMALS);

    await asset.connect(alice).approve(await pool.getAddress(), collateralAmt);
    await pool.connect(alice).deposit(await asset.getAddress(), collateralAmt);
    if (borrowAmt > 0n) {
      await pool.connect(alice).borrow(await asset.getAddress(), borrowAmt);
    }
  }

  async function depositAsset(user: any, token: any, amount: string) {
    const amt = ethers.parseUnits(amount, DECIMALS);
    await token.connect(user).approve(await pool.getAddress(), amt);
    await pool.connect(user).deposit(await token.getAddress(), amt);
  }

  async function borrowAsset(user: any, token: any, amount: string) {
    const amt = ethers.parseUnits(amount, DECIMALS);
    await pool.connect(user).borrow(await token.getAddress(), amt);
  }

  async function initSecondaryReserve(params?: {
    price?: bigint;
    ltvBps?: number;
    liquidationThresholdBps?: number;
  }) {
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const otherAsset = await MockERC20.deploy("Mock USDC", "USDC", DECIMALS);

    const AToken = await ethers.getContractFactory("AToken");
    const otherAToken = await AToken.deploy(
      await pool.getAddress(),
      await otherAsset.getAddress(),
      DECIMALS,
    );

    const DebtToken = await ethers.getContractFactory("VariableDebtToken");
    const otherDebtToken = await DebtToken.deploy(
      await pool.getAddress(),
      await otherAsset.getAddress(),
      DECIMALS,
    );

    await pool.initReserve(
      await otherAsset.getAddress(),
      await otherAToken.getAddress(),
      await otherDebtToken.getAddress(),
      DECIMALS,
      params?.ltvBps ?? 8000,
      params?.liquidationThresholdBps ?? 8500,
      10500,
      1000,
    );

    if (params?.price !== undefined) {
      await oracle.setPrice(await otherAsset.getAddress(), params.price);
    }

    await otherAsset.mint(await bob.getAddress(), ethers.parseUnits("1000", DECIMALS));
    await otherAsset.mint(
      await alice.getAddress(),
      ethers.parseUnits("1000", DECIMALS),
    );

    return { otherAsset, otherAToken, otherDebtToken };
  }

  it("user without position should return zero balances and max health factor", async function () {
    const data = await pool.getUserAccountData(await alice.getAddress());

    expect(data.collateralUsdWad).to.equal(0n);
    expect(data.debtUsdWad).to.equal(0n);
    expect(data.maxBorrowUsdWad).to.equal(0n);
    expect(data.healthFactorWad).to.equal(ethers.MaxUint256);
  });

  it("account data should not revert if an unrelated reserve has no oracle price", async function () {
    await initSecondaryReserve();

    const data = await pool.getUserAccountData(await alice.getAddress());
    expect(data.collateralUsdWad).to.equal(0n);
    expect(data.debtUsdWad).to.equal(0n);
    expect(data.maxBorrowUsdWad).to.equal(0n);
    expect(data.healthFactorWad).to.equal(ethers.MaxUint256);
  });

  it("should revert when user has position on a reserve without oracle price", async function () {
    const { otherAsset } = await initSecondaryReserve();

    await depositAsset(bob, otherAsset, "300");
    await depositAsset(alice, otherAsset, "50");

    await expect(
      pool.getUserAccountData(await alice.getAddress()),
    ).to.be.revertedWith("PRICE_NOT_SET");
  });

  it("only deposit should have debt = 0 and correct max borrow", async function () {
    await setupAlicePosition("100", "0");

    const data = await pool.getUserAccountData(await alice.getAddress());
    expect(data.collateralUsdWad).to.equal(ethers.parseUnits("100", 18));
    expect(data.debtUsdWad).to.equal(0n);
    expect(data.maxBorrowUsdWad).to.equal(ethers.parseUnits("80", 18));
    expect(data.healthFactorWad).to.equal(ethers.MaxUint256);
  });

  it("deposit and borrow should return positive debt and hf > 1", async function () {
    await setupLiquidity("500");
    await setupAlicePosition("100", "50");

    const data = await pool.getUserAccountData(await alice.getAddress());
    expect(data.collateralUsdWad).to.equal(ethers.parseUnits("100", 18));
    expect(data.debtUsdWad).to.equal(ethers.parseUnits("50", 18));
    expect(data.maxBorrowUsdWad).to.equal(ethers.parseUnits("80", 18));
    expect(data.healthFactorWad).to.equal(ethers.parseUnits("1.7", 18));
  });

  it("getHealthFactor should equal getUserAccountData healthFactorWad", async function () {
    await setupLiquidity("500");
    await setupAlicePosition("100", "40");

    const data = await pool.getUserAccountData(await alice.getAddress());
    const hf = await pool.getHealthFactor(await alice.getAddress());
    expect(hf).to.equal(data.healthFactorWad);
  });

  it("price decrease should keep health factor unchanged in single-asset position", async function () {
    await setupLiquidity("500");
    await setupAlicePosition("100", "40");

    const beforeData = await pool.getUserAccountData(await alice.getAddress());
    await oracle.setPrice(await asset.getAddress(), ethers.parseUnits("0.8", DECIMALS));
    const afterData = await pool.getUserAccountData(await alice.getAddress());

    expect(afterData.collateralUsdWad).to.be.lt(beforeData.collateralUsdWad);
    expect(afterData.debtUsdWad).to.be.lt(beforeData.debtUsdWad);
    expect(afterData.maxBorrowUsdWad).to.be.lt(beforeData.maxBorrowUsdWad);
    expect(afterData.healthFactorWad).to.equal(beforeData.healthFactorWad);
  });

  it("price increase should keep health factor unchanged in single-asset position", async function () {
    await setupLiquidity("500");
    await setupAlicePosition("100", "40");

    const beforeData = await pool.getUserAccountData(await alice.getAddress());
    await oracle.setPrice(await asset.getAddress(), ethers.parseUnits("1.2", DECIMALS));
    const afterData = await pool.getUserAccountData(await alice.getAddress());

    expect(afterData.collateralUsdWad).to.be.gt(beforeData.collateralUsdWad);
    expect(afterData.debtUsdWad).to.be.gt(beforeData.debtUsdWad);
    expect(afterData.maxBorrowUsdWad).to.be.gt(beforeData.maxBorrowUsdWad);
    expect(afterData.healthFactorWad).to.equal(beforeData.healthFactorWad);
  });

  it("should aggregate account data across multiple reserves", async function () {
    const { otherAsset } = await initSecondaryReserve({
      price: ethers.parseUnits("2", DECIMALS),
    });

    await setupLiquidity("500");
    await depositAsset(bob, otherAsset, "500");

    await setupAlicePosition("100", "40");
    await depositAsset(alice, otherAsset, "50");
    await borrowAsset(alice, otherAsset, "10");

    const data = await pool.getUserAccountData(await alice.getAddress());

    // Reserve1: collateral 100, debt 40, maxBorrow 80, liquidationThreshold 85
    // Reserve2 (price=2): collateral 50->100, debt 10->20, maxBorrow 80, liquidationThreshold 85
    // Totals: collateral 200, debt 60, maxBorrow 160, liquidationThreshold 170
    const expectedCollateral = ethers.parseUnits("200", 18);
    const expectedDebt = ethers.parseUnits("60", 18);
    const expectedMaxBorrow = ethers.parseUnits("160", 18);
    const expectedHealthFactor = (ethers.parseUnits("170", 18) * WAD) / expectedDebt;

    expect(data.collateralUsdWad).to.equal(expectedCollateral);
    expect(data.debtUsdWad).to.equal(expectedDebt);
    expect(data.maxBorrowUsdWad).to.equal(expectedMaxBorrow);
    expect(data.healthFactorWad).to.equal(expectedHealthFactor);
  });

  it("should return health factor = 1.0 when ltv equals liquidation threshold and debt is at limit", async function () {
    const { otherAsset } = await initSecondaryReserve({
      price: ONE,
      ltvBps: 8500,
      liquidationThresholdBps: 8500,
    });

    await depositAsset(bob, otherAsset, "500");
    await depositAsset(alice, otherAsset, "100");
    await borrowAsset(alice, otherAsset, "85");

    const data = await pool.getUserAccountData(await alice.getAddress());
    expect(data.collateralUsdWad).to.equal(ethers.parseUnits("100", 18));
    expect(data.debtUsdWad).to.equal(ethers.parseUnits("85", 18));
    expect(data.maxBorrowUsdWad).to.equal(ethers.parseUnits("85", 18));
    expect(data.healthFactorWad).to.equal(WAD);
  });
});
