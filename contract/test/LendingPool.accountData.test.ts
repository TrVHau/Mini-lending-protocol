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

    return { otherAsset };
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

  it("returns zero balances and max HF for user without position", async function () {
    const data = await pool.getUserAccountData(await alice.getAddress());

    expect(data.collateralUsdWad).to.equal(0n);
    expect(data.debtUsdWad).to.equal(0n);
    expect(data.maxBorrowUsdWad).to.equal(0n);
    expect(data.healthFactorWad).to.equal(ethers.MaxUint256);
  });

  it("reverts when user has position on reserve without price", async function () {
    const { otherAsset } = await initSecondaryReserve();
    await depositAsset(bob, otherAsset, "300");
    await depositAsset(alice, otherAsset, "50");

    await expect(
      pool.getUserAccountData(await alice.getAddress()),
    ).to.be.revertedWith("PRICE_NOT_SET");
  });

  it("returns correct values for deposit-only position", async function () {
    await setupAlicePosition("100", "0");

    const data = await pool.getUserAccountData(await alice.getAddress());
    expect(data.collateralUsdWad).to.equal(ethers.parseUnits("100", 18));
    expect(data.debtUsdWad).to.equal(0n);
    expect(data.maxBorrowUsdWad).to.equal(ethers.parseUnits("80", 18));
    expect(data.healthFactorWad).to.equal(ethers.MaxUint256);
  });

  it("returns correct values for deposit+borrow position", async function () {
    await setupLiquidity("500");
    await setupAlicePosition("100", "50");

    const data = await pool.getUserAccountData(await alice.getAddress());
    expect(data.collateralUsdWad).to.equal(ethers.parseUnits("100", 18));
    expect(data.debtUsdWad).to.equal(ethers.parseUnits("50", 18));
    expect(data.maxBorrowUsdWad).to.equal(ethers.parseUnits("80", 18));
    expect(data.healthFactorWad).to.equal(ethers.parseUnits("1.7", 18));
  });

  it("aggregates account data across multiple reserves", async function () {
    const { otherAsset } = await initSecondaryReserve({
      price: ethers.parseUnits("2", DECIMALS),
    });

    await setupLiquidity("500");
    await depositAsset(bob, otherAsset, "500");

    await setupAlicePosition("100", "40");
    await depositAsset(alice, otherAsset, "50");
    await borrowAsset(alice, otherAsset, "10");

    const data = await pool.getUserAccountData(await alice.getAddress());
    const expectedCollateral = ethers.parseUnits("200", 18);
    const expectedDebt = ethers.parseUnits("60", 18);
    const expectedMaxBorrow = ethers.parseUnits("160", 18);
    const expectedHealthFactor = (ethers.parseUnits("170", 18) * WAD) / expectedDebt;

    expect(data.collateralUsdWad).to.equal(expectedCollateral);
    expect(data.debtUsdWad).to.equal(expectedDebt);
    expect(data.maxBorrowUsdWad).to.equal(expectedMaxBorrow);
    expect(data.healthFactorWad).to.equal(expectedHealthFactor);
  });
});
