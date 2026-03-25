import { expect } from "chai";
import { ethers } from "hardhat";

describe("LendingPool - deposit/withdraw/borrow/repay", function () {
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

  // Deploy contracts and set up initial state before each test

  beforeEach(async function () {
    [owner, bob, alice] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    asset = await MockERC20.deploy("Mock DAI", "DAI", DECIMALS);

    const MockPriceOracle = await ethers.getContractFactory("MockPriceOracle");
    oracle = await MockPriceOracle.deploy(await owner.getAddress()); // 1 DAI = 1 USD
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

    const VariableDebtToken =
      await ethers.getContractFactory("VariableDebtToken");
    debtToken = await VariableDebtToken.deploy(
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

  // deposit tests

  it("deposit zero amount should revert", async function () {
    const amount = ethers.parseUnits("0", DECIMALS);

    await asset.connect(alice).approve(await pool.getAddress(), amount);
    await expect(
      pool.connect(alice).deposit(await asset.getAddress(), amount),
    ).to.be.revertedWith("INVALID_AMOUNT");
  });

  it("deposit without reserve initialized not found", async function () {
    const amount = ethers.parseUnits("100", DECIMALS);

    const uninitializedAsset = await ethers.getContractFactory("MockERC20");
    const uninitializedAssetInstance = await uninitializedAsset.deploy(
      "Uninitialized Asset",
      "UA",
      DECIMALS,
    );
    await asset.connect(alice).approve(await pool.getAddress(), amount);
    await expect(
      pool
        .connect(alice)
        .deposit(await uninitializedAssetInstance.getAddress(), amount),
    ).to.be.revertedWith("RESERVE_NOT_FOUND");
  });

  it("deposit without approval should revert", async function () {
    const amount = ethers.parseUnits("100", DECIMALS);

    await expect(pool.connect(alice).deposit(await asset.getAddress(), amount))
      .to.be.reverted;
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

  // withdraw tests

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

  it("withdraw successfully, token underlying should transfer to user", async function () {
    const depositAmount = ethers.parseUnits("100", DECIMALS);
    const withdrawAmount = ethers.parseUnits("50", DECIMALS);

    await asset.connect(alice).approve(await pool.getAddress(), depositAmount);
    await pool.connect(alice).deposit(await asset.getAddress(), depositAmount);

    const aliceInitialBalance = await asset.balanceOf(await alice.getAddress());

    await pool
      .connect(alice)
      .withdraw(await asset.getAddress(), withdrawAmount);

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
