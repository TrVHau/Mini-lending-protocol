import { expect } from "chai";
import { ethers } from "hardhat";

describe("LendingPool - Liquidation", function () {
  let owner: any;
  let bob: any;
  let alice: any;
  let asset: any;
  let oracle: any;
  let pool: any;
  let aToken: any;
  let debtToken: any;
  let interestRateStrategy: any;

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

    const InterestRateStrategy = await ethers.getContractFactory(
      "DefaultInterestRateStrategy",
    );
    interestRateStrategy = await InterestRateStrategy.deploy(
      0,
      ethers.parseUnits("0.04", 18),
      ethers.parseUnits("0.75", 18),
      ethers.parseUnits("0.8", 27),
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
      await interestRateStrategy.getAddress(),
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

  it("revert when position is not healthy", async function () {
    await asset
      .connect(alice)
      .approve(pool.getAddress(), ethers.parseUnits("1000", DECIMALS));
    await asset
      .connect(bob)
      .approve(pool.getAddress(), ethers.parseUnits("1000", DECIMALS));

    await pool
      .connect(bob)
      .deposit(asset.getAddress(), ethers.parseUnits("500", DECIMALS));
    await pool
      .connect(alice)
      .deposit(asset.getAddress(), ethers.parseUnits("100", DECIMALS));
    await pool
      .connect(alice)
      .borrow(asset.getAddress(), ethers.parseUnits("60", DECIMALS));

    const debtToCover = ethers.parseUnits("10", DECIMALS);
    await expect(
      pool
        .connect(bob)
        .liquidate(
          await asset.getAddress(),
          await asset.getAddress(),
          await alice.getAddress(),
          debtToCover,
        ),
    ).to.be.revertedWith("HEALTHY_POSITION");
  });

  async function setupTwoReserves() {
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const col = await MockERC20.deploy("COL", "COL", DECIMALS);
    const debt = await MockERC20.deploy("DEBT", "DEBT", DECIMALS);

    const ATokenFactory = await ethers.getContractFactory("AToken");
    const VariableDebtTokenFactory =
      await ethers.getContractFactory("VariableDebtToken");

    const aCol = await ATokenFactory.deploy(
      await pool.getAddress(),
      await col.getAddress(),
      DECIMALS,
    );
    const dCol = await VariableDebtTokenFactory.deploy(
      await pool.getAddress(),
      await col.getAddress(),
      DECIMALS,
    );

    const aDebt = await ATokenFactory.deploy(
      await pool.getAddress(),
      await debt.getAddress(),
      DECIMALS,
    );
    const dDebt = await VariableDebtTokenFactory.deploy(
      await pool.getAddress(),
      await debt.getAddress(),
      DECIMALS,
    );

    await pool.initReserve(
      await col.getAddress(),
      await aCol.getAddress(),
      await dCol.getAddress(),
      await interestRateStrategy.getAddress(),
      DECIMALS,
      8000,
      8500,
      10500,
      1000,
    );

    await pool.initReserve(
      await debt.getAddress(),
      await aDebt.getAddress(),
      await dDebt.getAddress(),
      await interestRateStrategy.getAddress(),
      DECIMALS,
      8000,
      8500,
      10500,
      1000,
    );

    return { col, debt, aCol, dDebt };
  }

  async function getBorrowIndex(assetAddress: string) {
    const reserveData = await pool.getReserveData(assetAddress);
    return reserveData.borrowIndexRay;
  }

  async function getLiquidityIndex(assetAddress: string) {
    const reserveData = await pool.getReserveData(assetAddress);
    return reserveData.liquidityIndexRay;
  }

  it("partial liquidation success", async function () {
    const { col, debt, dDebt } = await setupTwoReserves();

    // set price col = 2000, deb = 1
    await oracle.setPrice(
      await col.getAddress(),
      ethers.parseUnits("2000", DECIMALS),
    );
    await oracle.setPrice(await debt.getAddress(), ONE);

    // mint + approve
    await col.mint(alice.getAddress(), ethers.parseUnits("2", DECIMALS));
    await debt.mint(bob.getAddress(), ethers.parseUnits("4000", DECIMALS));
    await (col.connect(alice) as any).approve(
      await pool.getAddress(),
      ethers.MaxUint256,
    );
    await (debt.connect(bob) as any).approve(
      await pool.getAddress(),
      ethers.MaxUint256,
    );

    // alice deposit 1 COL, bob deposit DEBT for liquidity, alice borrows DEBT
    await pool
      .connect(alice)
      .deposit(col.getAddress(), ethers.parseUnits("1", DECIMALS));
    await pool
      .connect(bob)
      .deposit(debt.getAddress(), ethers.parseUnits("2000", DECIMALS));
    await pool
      .connect(alice)
      .borrow(debt.getAddress(), ethers.parseUnits("1500", DECIMALS));

    // health position is bad, decrease col
    await oracle.setPrice(
      await col.getAddress(),
      ethers.parseUnits("1400", DECIMALS),
    );

    const debtBorrowIndexBefore = await getBorrowIndex(await debt.getAddress());
    const debtBefore = await dDebt.balanceOfWithIndex(
      await alice.getAddress(),
      debtBorrowIndexBefore,
    );
    const bobColBefore = await col.balanceOf(await bob.getAddress());

    const debtToCover = ethers.parseUnits("200", DECIMALS);
    await expect(
      pool
        .connect(bob)
        .liquidate(
          await col.getAddress(),
          await debt.getAddress(),
          await alice.getAddress(),
          debtToCover,
        ),
    ).to.emit(pool, "Liquidation");

    const debtBorrowIndex = await getBorrowIndex(await debt.getAddress());
    const debtAfter = await dDebt.balanceOfWithIndex(
      await alice.getAddress(),
      debtBorrowIndex,
    );
    const bobColAfter = await col.balanceOf(await bob.getAddress());

    expect(debtAfter).to.be.lt(debtBefore);
    expect(bobColAfter).to.be.gt(bobColBefore);
  });

  it("debtToCover > userDebt", async function () {
    const { col, debt, dDebt } = await setupTwoReserves();

    await oracle.setPrice(
      await col.getAddress(),
      ethers.parseUnits("2000", DECIMALS),
    );
    await oracle.setPrice(await debt.getAddress(), ONE);

    await col.mint(alice.getAddress(), ethers.parseUnits("2", DECIMALS));
    await debt.mint(bob.getAddress(), ethers.parseUnits("4000", DECIMALS));

    await (col.connect(alice) as any).approve(
      await pool.getAddress(),
      ethers.MaxUint256,
    );
    await (debt.connect(bob) as any).approve(
      await pool.getAddress(),
      ethers.MaxUint256,
    );

    await pool
      .connect(alice)
      .deposit(await col.getAddress(), ethers.parseUnits("2", DECIMALS));
    await pool
      .connect(bob)
      .deposit(await debt.getAddress(), ethers.parseUnits("2000", DECIMALS));
    await pool
      .connect(alice)
      .borrow(await debt.getAddress(), ethers.parseUnits("1000", DECIMALS));

    await oracle.setPrice(
      await col.getAddress(),
      ethers.parseUnits("550", DECIMALS),
    );

    const debtBorrowIndexBefore = await getBorrowIndex(await debt.getAddress());
    const userDebtBefore = await dDebt.balanceOfWithIndex(
      await alice.getAddress(),
      debtBorrowIndexBefore,
    );
    const bobDebtBefore = await debt.balanceOf(await bob.getAddress());

    await expect(
      pool
        .connect(bob)
        .liquidate(
          await col.getAddress(),
          await debt.getAddress(),
          await alice.getAddress(),
          userDebtBefore * 10n,
        ),
    ).to.emit(pool, "Liquidation");

    const debtBorrowIndexAfter = await getBorrowIndex(await debt.getAddress());
    const userDebtAfter = await dDebt.balanceOfWithIndex(
      await alice.getAddress(),
      debtBorrowIndexAfter,
    );
    const bobDebtAfter = await debt.balanceOf(await bob.getAddress());
    const bobSpent = bobDebtBefore - bobDebtAfter;

    expect(userDebtAfter).to.equal(0n);
    expect(bobSpent).to.be.gt(0n);
    // bobSpent may exceed userDebtBefore by a tiny amount because interest accrues
    // when _validateAndUpdateLiquidation calls _updateReserve mid-transaction.
    // Allow up to 0.01% extra to account for this.
    const tolerance = userDebtBefore / 10000n;
    expect(bobSpent).to.be.lte(userDebtBefore + tolerance);
  });

  it("collateral cap", async function () {
    const { col, debt, aCol, dDebt } = await setupTwoReserves();

    await oracle.setPrice(
      await col.getAddress(),
      ethers.parseUnits("1000", DECIMALS),
    );
    await oracle.setPrice(await debt.getAddress(), ONE);

    await col.mint(alice.getAddress(), ethers.parseUnits("1", DECIMALS));
    await debt.mint(bob.getAddress(), ethers.parseUnits("3000", DECIMALS));

    await (col.connect(alice) as any).approve(
      await pool.getAddress(),
      ethers.MaxUint256,
    );
    await (debt.connect(bob) as any).approve(
      await pool.getAddress(),
      ethers.MaxUint256,
    );

    await pool
      .connect(alice)
      .deposit(await col.getAddress(), ethers.parseUnits("1", DECIMALS));
    await pool
      .connect(bob)
      .deposit(await debt.getAddress(), ethers.parseUnits("2500", DECIMALS));
    await pool
      .connect(alice)
      .borrow(await debt.getAddress(), ethers.parseUnits("700", DECIMALS));

    const colLiquidityIndexBefore = await getLiquidityIndex(
      await col.getAddress(),
    );
    const aliceCollateralBefore = await aCol.balanceOfWithIndex(
      await alice.getAddress(),
      colLiquidityIndexBefore,
    );
    expect(aliceCollateralBefore).to.be.gt(0n);

    await oracle.setPrice(
      await col.getAddress(),
      ethers.parseUnits("100", DECIMALS),
    );

    await expect(
      pool
        .connect(bob)
        .liquidate(
          await col.getAddress(),
          await debt.getAddress(),
          await alice.getAddress(),
          ethers.parseUnits("700", DECIMALS),
        ),
    ).to.emit(pool, "Liquidation");

    const colLiquidityIndexAfter = await getLiquidityIndex(await col.getAddress());
    const debtBorrowIndexAfter = await getBorrowIndex(await debt.getAddress());
    const aliceCollateralAfter = await aCol.balanceOfWithIndex(
      await alice.getAddress(),
      colLiquidityIndexAfter,
    );
    const aliceDebtAfter = await dDebt.balanceOfWithIndex(
      await alice.getAddress(),
      debtBorrowIndexAfter,
    );

    expect(aliceCollateralAfter).to.equal(0n);
    expect(aliceDebtAfter).to.be.gt(0n);
  });
});
