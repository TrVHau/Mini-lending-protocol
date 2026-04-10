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
    await asset.mint(bob.getAddress(), ethers.parseUnits("1000", DECIMALS));
    await asset.mint(alice.getAddress(), ethers.parseUnits("1000", DECIMALS));
  });

  // helper
  async function setupLiquidity(amount: string) {
    // bob deposits 100 DAI
    await asset
      .connect(bob)
      .approve(pool.getAddress(), ethers.parseUnits(amount, DECIMALS));
    await pool
      .connect(bob)
      .deposit(
        await asset.getAddress(),
        ethers.parseUnits(amount, DECIMALS),
        0,
      );
  }

  async function setupAlicePosition(collateral: string, borrow: string) {
    // alice deposits collateral and borrows
    await asset
      .connect(alice)
      .approve(pool.getAddress(), ethers.parseUnits(collateral, DECIMALS));
    await pool
      .connect(alice)
      .deposit(
        await asset.getAddress(),
        ethers.parseUnits(collateral, DECIMALS),
        0,
      );
    await pool
      .connect(alice)
      .borrow(
        await asset.getAddress(),
        ethers.parseUnits(borrow, DECIMALS),
        0,
        0,
      );
  }

  // test
  it("User dont have position", async function () {
    const data = await pool.getUserAccountData(alice.getAddress());
    expect(data.collateralUsdWad).to.equal(0);
    expect(data.debtUsdWad).to.equal(0);
    expect(data.maxBorrowUsdWad).to.equal(0);
    expect(data.healthFactorWad).to.equal(ethers.MaxUint256);
  });

  it("Only deposit,no debt", async function () {});

  it("Deposit and borrow", async function () {});

  it("Health factor", async function () {});

  it("Price decrease so HF decrease", async function () {});

  it("Price increase so HF increase", async function () {});
});
