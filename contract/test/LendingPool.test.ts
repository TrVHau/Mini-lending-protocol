import { expect } from "chai";
import { ethers } from "hardhat";

describe("LendingPool", function () {
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

    const ATokenFactory = await ethers.getContractFactory("AToken");
    aToken = await ATokenFactory.deploy(
      await pool.getAddress(),
      await asset.getAddress(),
      DECIMALS,
    );

    const VariableDebtTokenFactory =
      await ethers.getContractFactory("VariableDebtToken");
    debtToken = await VariableDebtTokenFactory.deploy(
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

  async function createUninitializedAsset() {
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    return MockERC20.deploy("Uninitialized Asset", "UA", DECIMALS);
  }

  async function createSecondaryReserveTokens() {
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const otherAsset = await MockERC20.deploy("Other Asset", "OA", DECIMALS);

    const ATokenFactory = await ethers.getContractFactory("AToken");
    const otherAToken = await ATokenFactory.deploy(
      await pool.getAddress(),
      await otherAsset.getAddress(),
      DECIMALS,
    );

    const VariableDebtTokenFactory =
      await ethers.getContractFactory("VariableDebtToken");
    const otherDebtToken = await VariableDebtTokenFactory.deploy(
      await pool.getAddress(),
      await otherAsset.getAddress(),
      DECIMALS,
    );

    return { otherAsset, otherAToken, otherDebtToken };
  }

  async function setupAliceDebt(
    liquidityAmount: bigint,
    collateralAmount: bigint,
    borrowAmount: bigint,
  ) {
    await asset.connect(bob).approve(await pool.getAddress(), liquidityAmount);
    await pool.connect(bob).deposit(await asset.getAddress(), liquidityAmount);

    await asset
      .connect(alice)
      .approve(await pool.getAddress(), collateralAmount);
    await pool
      .connect(alice)
      .deposit(await asset.getAddress(), collateralAmount);

    await pool.connect(alice).borrow(await asset.getAddress(), borrowAmount);
  }

  describe("deposit", function () {
    it("reverts on zero amount", async function () {
      await expect(
        pool.connect(alice).deposit(await asset.getAddress(), 0),
      ).to.be.revertedWith("INVALID_AMOUNT");
    });

    it("reverts on unknown reserve", async function () {
      const amount = ethers.parseUnits("100", DECIMALS);
      const uninitializedAsset = await createUninitializedAsset();

      await asset.connect(alice).approve(await pool.getAddress(), amount);
      await expect(
        pool.connect(alice).deposit(await uninitializedAsset.getAddress(), amount),
      ).to.be.revertedWith("RESERVE_NOT_FOUND");
    });

    it("mints aToken balance on success", async function () {
      const amount = ethers.parseUnits("100", DECIMALS);

      await asset.connect(alice).approve(await pool.getAddress(), amount);
      await pool.connect(alice).deposit(await asset.getAddress(), amount);

      expect(await aToken.scaledBalanceOf(await alice.getAddress())).to.equal(
        amount,
      );
    });
  });

  describe("withdraw", function () {
    it("reverts on zero amount", async function () {
      await expect(
        pool.connect(alice).withdraw(await asset.getAddress(), 0),
      ).to.be.revertedWith("INVALID_AMOUNT");
    });

    it("reverts when withdrawing above balance", async function () {
      const depositAmount = ethers.parseUnits("100", DECIMALS);
      const withdrawAmount = ethers.parseUnits("150", DECIMALS);

      await asset.connect(alice).approve(await pool.getAddress(), depositAmount);
      await pool.connect(alice).deposit(await asset.getAddress(), depositAmount);

      await expect(
        pool.connect(alice).withdraw(await asset.getAddress(), withdrawAmount),
      ).to.be.revertedWith("BURN_EXCEEDS_BALANCE");
    });

    it("transfers underlying on success", async function () {
      const depositAmount = ethers.parseUnits("100", DECIMALS);
      const withdrawAmount = ethers.parseUnits("50", DECIMALS);

      await asset.connect(alice).approve(await pool.getAddress(), depositAmount);
      await pool.connect(alice).deposit(await asset.getAddress(), depositAmount);

      const balanceBefore = await asset.balanceOf(await alice.getAddress());
      await pool.connect(alice).withdraw(await asset.getAddress(), withdrawAmount);
      const balanceAfter = await asset.balanceOf(await alice.getAddress());

      expect(balanceAfter - balanceBefore).to.equal(withdrawAmount);
    });
  });

  describe("borrow", function () {
    it("reverts on zero amount", async function () {
      await expect(
        pool.connect(alice).borrow(await asset.getAddress(), 0),
      ).to.be.revertedWith("INVALID_AMOUNT");
    });

    it("reverts when liquidity is insufficient", async function () {
      const liquidityAmount = ethers.parseUnits("10", DECIMALS);
      const borrowAmount = ethers.parseUnits("20", DECIMALS);

      await asset.connect(bob).approve(await pool.getAddress(), liquidityAmount);
      await pool.connect(bob).deposit(await asset.getAddress(), liquidityAmount);

      await expect(
        pool.connect(alice).borrow(await asset.getAddress(), borrowAmount),
      ).to.be.revertedWith("INSUFFICIENT_LIQUIDITY");
    });

    it("reverts when collateral is insufficient", async function () {
      const amount = ethers.parseUnits("100", DECIMALS);

      await asset.connect(bob).approve(await pool.getAddress(), amount);
      await pool.connect(bob).deposit(await asset.getAddress(), amount);

      await expect(
        pool.connect(alice).borrow(await asset.getAddress(), amount),
      ).to.be.revertedWith("INSUFFICIENT_COLLATERAL");
    });

    it("increases debt and transfers underlying on success", async function () {
      const liquidityAmount = ethers.parseUnits("1000", DECIMALS);
      const collateralAmount = ethers.parseUnits("100", DECIMALS);
      const borrowAmount = ethers.parseUnits("50", DECIMALS);
      const aliceAddress = await alice.getAddress();
      const assetAddress = await asset.getAddress();

      await asset.connect(bob).approve(await pool.getAddress(), liquidityAmount);
      await pool.connect(bob).deposit(assetAddress, liquidityAmount);
      await asset.connect(alice).approve(await pool.getAddress(), collateralAmount);
      await pool.connect(alice).deposit(assetAddress, collateralAmount);

      const [, borrowIndexRay] = await pool.getReserveIndexes(assetAddress);
      const balanceBefore = await asset.balanceOf(aliceAddress);
      await pool.connect(alice).borrow(assetAddress, borrowAmount);
      const balanceAfter = await asset.balanceOf(aliceAddress);
      const debtAfter = await debtToken.balanceOfWithIndex(
        aliceAddress,
        borrowIndexRay,
      );

      expect(balanceAfter - balanceBefore).to.equal(borrowAmount);
      expect(debtAfter).to.equal(borrowAmount);
    });
  });

  describe("repay", function () {
    it("reverts on zero amount", async function () {
      await expect(
        pool.connect(alice).repay(await asset.getAddress(), 0),
      ).to.be.revertedWith("INVALID_AMOUNT");
    });

    it("reverts when user has no debt", async function () {
      const amount = ethers.parseUnits("1", DECIMALS);
      await expect(
        pool.connect(alice).repay(await asset.getAddress(), amount),
      ).to.be.revertedWith("NO_DEBT");
    });

    it("repays all debt when amount is greater than debt", async function () {
      const liquidityAmount = ethers.parseUnits("1000", DECIMALS);
      const collateralAmount = ethers.parseUnits("100", DECIMALS);
      const borrowAmount = ethers.parseUnits("50", DECIMALS);
      const repayAmount = ethers.parseUnits("80", DECIMALS);
      const aliceAddress = await alice.getAddress();
      const assetAddress = await asset.getAddress();

      await setupAliceDebt(liquidityAmount, collateralAmount, borrowAmount);
      const [, borrowIndexRay] = await pool.getReserveIndexes(assetAddress);

      await asset.connect(alice).approve(await pool.getAddress(), repayAmount);
      await pool.connect(alice).repay(assetAddress, repayAmount);

      const debtAfter = await debtToken.balanceOfWithIndex(
        aliceAddress,
        borrowIndexRay,
      );
      expect(debtAfter).to.equal(0n);
    });
  });

  describe("admin and reserve config", function () {
    it("non-owner cannot init reserve", async function () {
      const { otherAsset, otherAToken, otherDebtToken } =
        await createSecondaryReserveTokens();

      await expect(
        pool
          .connect(alice)
          .initReserve(
            await otherAsset.getAddress(),
            await otherAToken.getAddress(),
            await otherDebtToken.getAddress(),
            DECIMALS,
            8000,
            8500,
            10500,
            1000,
          ),
      ).to.be.reverted;
    });

    it("cannot init an existing reserve twice", async function () {
      await expect(
        pool.initReserve(
          await asset.getAddress(),
          await aToken.getAddress(),
          await debtToken.getAddress(),
          DECIMALS,
          8000,
          8500,
          10500,
          1000,
        ),
      ).to.be.revertedWith("RESERVE_EXISTS");
    });

    it("rejects invalid ltv configuration", async function () {
      const { otherAsset, otherAToken, otherDebtToken } =
        await createSecondaryReserveTokens();

      await expect(
        pool.initReserve(
          await otherAsset.getAddress(),
          await otherAToken.getAddress(),
          await otherDebtToken.getAddress(),
          DECIMALS,
          8600,
          8500,
          10500,
          1000,
        ),
      ).to.be.revertedWith("BAD_LTV");
    });
  });
});
