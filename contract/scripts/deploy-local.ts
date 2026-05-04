import { ethers } from "hardhat";

async function main() {
  const [deployer, user] = await ethers.getSigners();

  const Oracle = await ethers.getContractFactory("MockPriceOracle");
  const oracle = await Oracle.deploy(deployer.address);
  await oracle.waitForDeployment();

  const LendingPool = await ethers.getContractFactory("LendingPool");
  const pool = await LendingPool.deploy(oracle.target, deployer.address);
  await pool.waitForDeployment();

  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const weth = await MockERC20.deploy("Wrapped Ether", "WETH", 18);
  const dai = await MockERC20.deploy("Dai Stablecoin", "DAI", 18);
  await weth.waitForDeployment();
  await dai.waitForDeployment();

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

  await pool.initReserve(
    weth.target,
    aWETH.target,
    dWETH.target,
    18,
    7500,
    8000,
    10500,
    1000,
  );

  await pool.initReserve(
    dai.target,
    aDAI.target,
    dDAI.target,
    18,
    8000,
    8500,
    10500,
    1000,
  );

  await oracle.setPrice(weth.target, ethers.parseUnits("2000", 8));
  await oracle.setPrice(dai.target, ethers.parseUnits("1", 8));

  await weth.mint(user.address, ethers.parseUnits("10", 18));
  await dai.mint(user.address, ethers.parseUnits("10000", 18));

  console.log("Deployer:", deployer.address);
  console.log("User:", user.address);
  console.log("Oracle:", oracle.target);
  console.log("LendingPool:", pool.target);
  console.log(
    "WETH:",
    weth.target,
    "aWETH:",
    aWETH.target,
    "dWETH:",
    dWETH.target,
  );
  console.log("DAI:", dai.target, "aDAI:", aDAI.target, "dDAI:", dDAI.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
