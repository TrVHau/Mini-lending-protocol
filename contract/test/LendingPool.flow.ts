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

  const DECIMALS = 18;
  const ONE = ethers.parseUnits("1", DECIMALS);

  // Deploy contracts and set up initial state before each test

  beforeEach(async function () {
    [owner, bob, alice] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    asset = await MockERC20.deploy("Mock DAI", "DAI", DECIMALS);

    const MockPriceOracle = await ethers.getContractFactory("MockPriceOracle");
    oracle = await MockPriceOracle.deploy(owner.address); // 1 DAI = 1 USD
    console.log("Hello");
    const LendingPool = await ethers.getContractFactory("LendingPool");
    pool = await LendingPool.deploy(asset.address, oracle.address);
    console.log("Hello");
    const ATOKEN = await ethers.getContractFactory("AToken");
    aToken = await ATOKEN.deploy(pool.address, "A DAI", "aDAI", DECIMALS);

    const AToken = await ethers.getContractFactory("AToken");
    aToken = await AToken.deploy(
      await pool.getAddress(),
      await asset.name(),
      await asset.symbol(),
      DECIMALS,
    );

    const VariableDebtToken =
      await ethers.getContractFactory("VariableDebtToken");
    debtToken = await VariableDebtToken.deploy(
      await pool.getAddress(),
      await asset.name(),
      `variableDebt${await asset.symbol()}`,
      DECIMALS,
    );

    await pool.initReverse(
      asset.address,
      aToken.address,
      debtToken.address,
      DECIMALS,
      8000,
      8500,
      10500,
      1000,
    );

    await oracle.setPrice(await asset.address, ONE);

    await asset.mint(bob.address, ethers.parseUnits("1000", DECIMALS));
    await asset.mint(alice.address, ethers.parseUnits("1000", DECIMALS));
  });

  it("deposit successful", async function () {
    const amount = ethers.parseUnits("100", DECIMALS);

    await asset.connect(alice).approve(pool.address, amount);
    await expect(pool.connect(alice).deposit(alice.address, amount)).to.not.be
      .reverted;
  });
});
