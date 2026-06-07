import { expect } from "chai";
import { ethers } from "hardhat";

describe("DefaultInterestRateStrategy", function () {
  const RAY = ethers.parseUnits("1", 27);
  const BASE_RATE = ethers.parseUnits("0.01", 18);
  const SLOPE1 = ethers.parseUnits("0.04", 18);
  const SLOPE2 = ethers.parseUnits("0.75", 18);
  const OPTIMAL_UTILIZATION = ethers.parseUnits("0.8", 27);
  const SECONDS_PER_YEAR = 365n * 24n * 60n * 60n;

  async function deployStrategy(params?: {
    baseRate?: bigint;
    slope1?: bigint;
    slope2?: bigint;
    optimalUtilization?: bigint;
  }) {
    const Strategy = await ethers.getContractFactory(
      "DefaultInterestRateStrategy",
    );
    return Strategy.deploy(
      params?.baseRate ?? BASE_RATE,
      params?.slope1 ?? SLOPE1,
      params?.slope2 ?? SLOPE2,
      params?.optimalUtilization ?? OPTIMAL_UTILIZATION,
    );
  }

  it("uses the base rate when there is no debt", async function () {
    const strategy = await deployStrategy();

    const rates = await strategy.calculateInterestRates(1000n, 0n, 1000);

    expect(rates.borrowRateRayPerSecond).to.equal(
      (BASE_RATE * RAY) / ethers.parseUnits("1", 18) / SECONDS_PER_YEAR,
    );
    expect(rates.liquidityRateRayPerSecond).to.equal(0n);
  });

  it("increases borrow rate with utilization below optimal utilization", async function () {
    const strategy = await deployStrategy({ baseRate: 0n });

    const lowUtilization = await strategy.calculateInterestRates(900n, 100n, 1000);
    const highUtilization = await strategy.calculateInterestRates(500n, 500n, 1000);

    expect(highUtilization.borrowRateRayPerSecond).to.be.gt(
      lowUtilization.borrowRateRayPerSecond,
    );
    expect(highUtilization.liquidityRateRayPerSecond).to.be.gt(
      lowUtilization.liquidityRateRayPerSecond,
    );
  });

  it("jumps to slope2 after optimal utilization", async function () {
    const strategy = await deployStrategy({ baseRate: 0n });

    const atOptimal = await strategy.calculateInterestRates(200n, 800n, 0);
    const aboveOptimal = await strategy.calculateInterestRates(100n, 900n, 0);

    expect(aboveOptimal.borrowRateRayPerSecond).to.be.gt(
      atOptimal.borrowRateRayPerSecond,
    );
  });

  it("rejects invalid optimal utilization", async function () {
    await expect(
      deployStrategy({ optimalUtilization: 0n }),
    ).to.be.revertedWith("BAD_OPTIMAL_UTILIZATION");

    await expect(
      deployStrategy({ optimalUtilization: RAY }),
    ).to.be.revertedWith("BAD_OPTIMAL_UTILIZATION");
  });
});
