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
    await asset.mint(bob.getAddress(), ethers.parseUnits("1000", DECIMALS));
    await asset.mint(alice.getAddress(), ethers.parseUnits("1000", DECIMALS));
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
    it("deposit zero amount should revert", async function () {
      const amount = ethers.parseUnits("0", DECIMALS);

      await asset.connect(alice).approve(await pool.getAddress(), amount);
      await expect(
        pool.connect(alice).deposit(await asset.getAddress(), amount),
      ).to.be.revertedWith("INVALID_AMOUNT");
    });

    it("deposit without reserve initialized not found", async function () {
      const amount = ethers.parseUnits("100", DECIMALS);
      const uninitializedAsset = await createUninitializedAsset();

      await asset.connect(alice).approve(await pool.getAddress(), amount);
      await expect(
        pool.connect(alice).deposit(await uninitializedAsset.getAddress(), amount),
      ).to.be.revertedWith("RESERVE_NOT_FOUND");
    });

    it("deposit without approval should revert", async function () {
      const amount = ethers.parseUnits("100", DECIMALS);

      await expect(
        pool.connect(alice).deposit(await asset.getAddress(), amount),
      ).to.be.reverted;
    });

    it("deposit sucessfully then aToken balance should increase", async function () {
      const amount = ethers.parseUnits("100", DECIMALS);

      await asset.connect(alice).approve(await pool.getAddress(), amount);
      await pool.connect(alice).deposit(await asset.getAddress(), amount);

      expect(await aToken.scaledBalanceOf(await alice.getAddress())).to.equal(
        amount,
      );
    });

    it("deposit successfully then event should be emitted", async function () {
      const amount = ethers.parseUnits("100", DECIMALS);

      await asset.connect(alice).approve(await pool.getAddress(), amount);
      await expect(pool.connect(alice).deposit(await asset.getAddress(), amount))
        .to.emit(pool, "Deposit")
        .withArgs(await alice.getAddress(), await asset.getAddress(), amount);
    });
  });

  describe("withdraw", function () {
    it("withdraw zero amount should revert", async function () {
      const amount = ethers.parseUnits("0", DECIMALS);

      await expect(
        pool.connect(alice).withdraw(await asset.getAddress(), amount),
      ).to.be.revertedWith("INVALID_AMOUNT");
    });

    it("withdraw revert when over aToken balance", async function () {
      const depositAmount = ethers.parseUnits("100", DECIMALS);
      const withdrawAmount = ethers.parseUnits("150", DECIMALS);

      await asset.connect(alice).approve(await pool.getAddress(), depositAmount);
      await pool.connect(alice).deposit(await asset.getAddress(), depositAmount);

      await expect(
        pool.connect(alice).withdraw(await asset.getAddress(), withdrawAmount),
      ).to.be.revertedWith("BURN_EXCEEDS_BALANCE");
    });

    it("withdraw on uninitialized reserve should revert", async function () {
      const amount = ethers.parseUnits("1", DECIMALS);
      const uninitializedAsset = await createUninitializedAsset();

      await expect(
        pool
          .connect(alice)
          .withdraw(await uninitializedAsset.getAddress(), amount),
      ).to.be.revertedWith("RESERVE_NOT_FOUND");
    });

    it("withdraw successfully, token underlying should transfer to user", async function () {
      const depositAmount = ethers.parseUnits("100", DECIMALS);
      const withdrawAmount = ethers.parseUnits("50", DECIMALS);

      await asset.connect(alice).approve(await pool.getAddress(), depositAmount);
      await pool.connect(alice).deposit(await asset.getAddress(), depositAmount);

      const aliceInitialBalance = await asset.balanceOf(await alice.getAddress());

      await pool.connect(alice).withdraw(await asset.getAddress(), withdrawAmount);

      const aliceFinalBalance = await asset.balanceOf(await alice.getAddress());
      expect(aliceFinalBalance - aliceInitialBalance).to.equal(withdrawAmount);
    });

    it("withdraw successfully then event should be emitted", async function () {
      const depositAmount = ethers.parseUnits("100", DECIMALS);
      const withdrawAmount = ethers.parseUnits("50", DECIMALS);

      await asset.connect(alice).approve(await pool.getAddress(), depositAmount);
      await pool.connect(alice).deposit(await asset.getAddress(), depositAmount);

      await expect(
        pool.connect(alice).withdraw(await asset.getAddress(), withdrawAmount),
      )
        .to.emit(pool, "Withdraw")
        .withArgs(
          await alice.getAddress(),
          await asset.getAddress(),
          withdrawAmount,
        );
    });
  });

  describe("borrow", function () {
    it("borrow revert when amount = 0", async function () {
      const amount = ethers.parseUnits("0", DECIMALS);

      await expect(
        pool.connect(alice).borrow(await asset.getAddress(), amount),
      ).to.be.revertedWith("INVALID_AMOUNT");
    });

    it("borrow doesn't have collateral should revert", async function () {
      const amount = ethers.parseUnits("100", DECIMALS);

      await asset.connect(bob).approve(await pool.getAddress(), amount);
      await pool.connect(bob).deposit(await asset.getAddress(), amount);

      await expect(
        pool.connect(alice).borrow(await asset.getAddress(), amount),
      ).to.be.revertedWith("INSUFFICIENT_COLLATERAL");
    });

    it("borrow on uninitialized reserve should revert", async function () {
      const amount = ethers.parseUnits("1", DECIMALS);
      const uninitializedAsset = await createUninitializedAsset();

      await expect(
        pool.connect(alice).borrow(await uninitializedAsset.getAddress(), amount),
      ).to.be.revertedWith("RESERVE_NOT_FOUND");
    });

    it("borrow should revert when reserve liquidity is insufficient", async function () {
      const liquidityAmount = ethers.parseUnits("10", DECIMALS);
      const borrowAmount = ethers.parseUnits("20", DECIMALS);

      await asset.connect(bob).approve(await pool.getAddress(), liquidityAmount);
      await pool.connect(bob).deposit(await asset.getAddress(), liquidityAmount);

      await expect(
        pool.connect(alice).borrow(await asset.getAddress(), borrowAmount),
      ).to.be.revertedWith("INSUFFICIENT_LIQUIDITY");
    });

    it("borrow successfully then event should be emitted", async function () {
      const liquidityAmount = ethers.parseUnits("1000", DECIMALS);
      const collateralAmount = ethers.parseUnits("100", DECIMALS);
      const borrowAmount = ethers.parseUnits("50", DECIMALS);

      await asset.connect(bob).approve(await pool.getAddress(), liquidityAmount);
      await pool.connect(bob).deposit(await asset.getAddress(), liquidityAmount);
      await asset
        .connect(alice)
        .approve(await pool.getAddress(), collateralAmount);
      await pool
        .connect(alice)
        .deposit(await asset.getAddress(), collateralAmount);

      await expect(
        pool.connect(alice).borrow(await asset.getAddress(), borrowAmount),
      )
        .to.emit(pool, "Borrow")
        .withArgs(
          await alice.getAddress(),
          await asset.getAddress(),
          borrowAmount,
        );
    });

    it("borrow successfully should increase debt and transfer underlying", async function () {
      const liquidityAmount = ethers.parseUnits("1000", DECIMALS);
      const collateralAmount = ethers.parseUnits("100", DECIMALS);
      const borrowAmount = ethers.parseUnits("50", DECIMALS);
      const aliceAddress = await alice.getAddress();
      const assetAddress = await asset.getAddress();

      await asset.connect(bob).approve(await pool.getAddress(), liquidityAmount);
      await pool.connect(bob).deposit(assetAddress, liquidityAmount);
      await asset
        .connect(alice)
        .approve(await pool.getAddress(), collateralAmount);
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
    it("repay on uninitialized reserve should revert", async function () {
      const amount = ethers.parseUnits("1", DECIMALS);
      const uninitializedAsset = await createUninitializedAsset();

      await expect(
        pool.connect(alice).repay(await uninitializedAsset.getAddress(), amount),
      ).to.be.revertedWith("RESERVE_NOT_FOUND");
    });

    it("repay amount = 0 should revert", async function () {
      const amount = ethers.parseUnits("0", DECIMALS);

      await expect(
        pool.connect(alice).repay(await asset.getAddress(), amount),
      ).to.be.revertedWith("INVALID_AMOUNT");
    });

    it("repay should revert when user has no debt", async function () {
      const amount = ethers.parseUnits("1", DECIMALS);

      await expect(
        pool.connect(alice).repay(await asset.getAddress(), amount),
      ).to.be.revertedWith("NO_DEBT");
    });

    it("repay partial should reduce debt and emit event", async function () {
      const liquidityAmount = ethers.parseUnits("1000", DECIMALS);
      const collateralAmount = ethers.parseUnits("100", DECIMALS);
      const borrowAmount = ethers.parseUnits("50", DECIMALS);
      const repayAmount = ethers.parseUnits("20", DECIMALS);
      const aliceAddress = await alice.getAddress();
      const assetAddress = await asset.getAddress();

      await setupAliceDebt(liquidityAmount, collateralAmount, borrowAmount);
      const [, borrowIndexRay] = await pool.getReserveIndexes(assetAddress);
      const debtBefore = await debtToken.balanceOfWithIndex(
        aliceAddress,
        borrowIndexRay,
      );

      await asset.connect(alice).approve(await pool.getAddress(), repayAmount);

      await expect(pool.connect(alice).repay(assetAddress, repayAmount))
        .to.emit(pool, "Repay")
        .withArgs(aliceAddress, assetAddress, repayAmount);

      const debtAfter = await debtToken.balanceOfWithIndex(
        aliceAddress,
        borrowIndexRay,
      );
      expect(debtBefore - debtAfter).to.equal(repayAmount);
    });

    it("repay full when amount > debt should only repay debt", async function () {
      const liquidityAmount = ethers.parseUnits("1000", DECIMALS);
      const collateralAmount = ethers.parseUnits("100", DECIMALS);
      const borrowAmount = ethers.parseUnits("50", DECIMALS);
      const repayAmount = ethers.parseUnits("80", DECIMALS);
      const aliceAddress = await alice.getAddress();
      const assetAddress = await asset.getAddress();

      await setupAliceDebt(liquidityAmount, collateralAmount, borrowAmount);
      const [, borrowIndexRay] = await pool.getReserveIndexes(assetAddress);

      await asset.connect(alice).approve(await pool.getAddress(), repayAmount);

      await expect(pool.connect(alice).repay(assetAddress, repayAmount))
        .to.emit(pool, "Repay")
        .withArgs(aliceAddress, assetAddress, borrowAmount);

      const debtAfter = await debtToken.balanceOfWithIndex(
        aliceAddress,
        borrowIndexRay,
      );
      expect(debtAfter).to.equal(0n);
    });

    it("repay without approval should revert", async function () {
      const liquidityAmount = ethers.parseUnits("1000", DECIMALS);
      const collateralAmount = ethers.parseUnits("100", DECIMALS);
      const borrowAmount = ethers.parseUnits("50", DECIMALS);
      const repayAmount = ethers.parseUnits("10", DECIMALS);

      await setupAliceDebt(liquidityAmount, collateralAmount, borrowAmount);

      await expect(
        pool.connect(alice).repay(await asset.getAddress(), repayAmount),
      ).to.be.reverted;
    });
  });

  describe("reserve and admin views", function () {
    it("getReserveAddresses should return initialized token addresses", async function () {
      const [aTokenAddress, debtTokenAddress] = await pool.getReserveAddresses(
        await asset.getAddress(),
      );

      expect(aTokenAddress).to.equal(await aToken.getAddress());
      expect(debtTokenAddress).to.equal(await debtToken.getAddress());
    });

    it("getReserveIndexes should return initial indexes", async function () {
      const RAY = ethers.parseUnits("1", 27);
      const [liquidityIndexRay, borrowIndexRay] = await pool.getReserveIndexes(
        await asset.getAddress(),
      );

      expect(liquidityIndexRay).to.equal(RAY);
      expect(borrowIndexRay).to.equal(RAY);
    });

    it("initReserve by non-owner should revert", async function () {
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

    it("initReserve with existing asset should revert", async function () {
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

    it("initReserve with bad liquidation threshold should revert", async function () {
      const { otherAsset, otherAToken, otherDebtToken } =
        await createSecondaryReserveTokens();

      await expect(
        pool.initReserve(
          await otherAsset.getAddress(),
          await otherAToken.getAddress(),
          await otherDebtToken.getAddress(),
          DECIMALS,
          8000,
          10001,
          10500,
          1000,
        ),
      ).to.be.revertedWith("BAD_LIQ_THRESHOLD");
    });

    it("initReserve with bad ltv should revert", async function () {
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

    it("initReserve with bad reserve factor should revert", async function () {
      const { otherAsset, otherAToken, otherDebtToken } =
        await createSecondaryReserveTokens();

      await expect(
        pool.initReserve(
          await otherAsset.getAddress(),
          await otherAToken.getAddress(),
          await otherDebtToken.getAddress(),
          DECIMALS,
          8000,
          8500,
          10500,
          10001,
        ),
      ).to.be.revertedWith("BAD_RESERVE_FACTOR");
    });
  });
});
