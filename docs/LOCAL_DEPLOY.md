# Local Deploy Guide (Hardhat)

## 0) Pre-req

From repo root:

```bash
cd contract
npm install
```

## 1) Start local chain

```bash
npx hardhat node
```

## 2) Deploy + init in Hardhat console

Open a new terminal:

```bash
cd contract
npx hardhat console --network localhost
```

Paste the script below in the console (example with 2 assets):

```js
const { ethers } = require("hardhat");

const [deployer, user] = await ethers.getSigners();

// Deploy oracle
const Oracle = await ethers.getContractFactory("MockPriceOracle");
const oracle = await Oracle.deploy(deployer.address);
await oracle.waitForDeployment();

// Deploy lending pool
const LendingPool = await ethers.getContractFactory("LendingPool");
const pool = await LendingPool.deploy(oracle.target, deployer.address);
await pool.waitForDeployment();

// Deploy interest rate strategy (annual WAD rates, optimal utilization in RAY)
const InterestRateStrategy = await ethers.getContractFactory("DefaultInterestRateStrategy");
const interestRateStrategy = await InterestRateStrategy.deploy(
  0,
  ethers.parseUnits("0.04", 18),
  ethers.parseUnits("0.75", 18),
  ethers.parseUnits("0.8", 27),
);
await interestRateStrategy.waitForDeployment();

// Deploy mock assets
const MockERC20 = await ethers.getContractFactory("MockERC20");
const weth = await MockERC20.deploy("Wrapped Ether", "WETH", 18);
const dai = await MockERC20.deploy("Dai Stablecoin", "DAI", 18);
await weth.waitForDeployment();
await dai.waitForDeployment();

// Deploy AToken + VariableDebtToken for each asset
const AToken = await ethers.getContractFactory("AToken");
const VariableDebtToken = await ethers.getContractFactory("VariableDebtToken");

const aWETH = await AToken.deploy(pool.target, weth.target, 18);
const dWETH = await VariableDebtToken.deploy(pool.target, weth.target, 18);
await aWETH.waitForDeployment();
await dWETH.waitForDeployment();

const aDAI = await AToken.deploy(pool.target, dai.target, 18);
const dDAI = await VariableDebtToken.deploy(pool.target, dai.target, 18);
await aDAI.waitForDeployment();
await dDAI.waitForDeployment();

// Init reserves (bps)
// ltvBps=7500, liquidationThresholdBps=8000, liquidationBonusBps=10500, reserveFactorBps=1000
await pool.initReserve(
  weth.target,
  aWETH.target,
  dWETH.target,
  interestRateStrategy.target,
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
  interestRateStrategy.target,
  18,
  8000,
  8500,
  10500,
  1000,
);

// Set prices (PRICE_DECIMALS = 8)
await oracle.setPrice(weth.target, ethers.parseUnits("2000", 8));
await oracle.setPrice(dai.target, ethers.parseUnits("1", 8));

// Mint test tokens to user
await weth.mint(user.address, ethers.parseUnits("10", 18));
await dai.mint(user.address, ethers.parseUnits("10000", 18));

console.log("Oracle:", oracle.target);
console.log("LendingPool:", pool.target);
console.log("InterestRateStrategy:", interestRateStrategy.target);
console.log(
  "WETH:",
  weth.target,
  "aWETH:",
  aWETH.target,
  "dWETH:",
  dWETH.target,
);
console.log("DAI:", dai.target, "aDAI:", aDAI.target, "dDAI:", dDAI.target);
```

## 3) Quick flow to verify (optional)

In console, use `user` to approve and deposit:

```js
const userWeth = weth.connect(user);
await userWeth.approve(pool.target, ethers.parseUnits("1", 18));
await pool.connect(user).deposit(weth.target, ethers.parseUnits("1", 18));
```

Borrow (requires collateral already deposited):

```js
await pool.connect(user).borrow(dai.target, ethers.parseUnits("100", 18));
```

Change price to trigger liquidation scenario:

```js
await oracle.setPrice(weth.target, ethers.parseUnits("1000", 8));
```

## Notes

- `PRICE_DECIMALS = 8` in `MockPriceOracle`, so use `ethers.parseUnits(value, 8)`.
- Update frontend config with the deployed addresses.
- If you add more assets, repeat: deploy token + aToken + debtToken + pass the strategy to `initReserve` + `setPrice`.
