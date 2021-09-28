import { Signer, Contract, ethers } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { BNPLSwapMarketExample, BNPLToken, FakeAaveLendingPool, IERC20 } from "../../typechain";
import { getContractForEnvironment } from "./getContractForEnvironment";

function shouldSetupFakeAave(hre: HardhatRuntimeEnvironment) {
  return !hre.network.live;
}
function shouldSetupFakeUniswap(hre: HardhatRuntimeEnvironment) {
  return !hre.network.live;
}
async function setupFakeAave(hre: HardhatRuntimeEnvironment, signer?: string | Signer | undefined) {
  const DAI = await hre.ethers.getContract("DAI", signer);
  const aDAI = await hre.ethers.getContract("aDAI", signer);

  const USDT = await hre.ethers.getContract("USDT", signer);
  const aUSDT = await hre.ethers.getContract("aUSDT", signer);

  const USDC = await hre.ethers.getContract("USDC", signer);
  const aUSDC = await hre.ethers.getContract("aUSDC", signer);
  const { mockContractsDeployer } = await hre.getNamedAccounts();

  const fakeAaveLendingPool = await hre.ethers.getContract<FakeAaveLendingPool>("FakeAaveLendingPool", signer || mockContractsDeployer);
  await fakeAaveLendingPool.deployed();

  await fakeAaveLendingPool.addAssetPair(DAI.address, aDAI.address);
  await fakeAaveLendingPool.addAssetPair(USDT.address, aUSDT.address);
  await fakeAaveLendingPool.addAssetPair(USDC.address, aUSDC.address);
}
async function setupFakeUniswap(hre: HardhatRuntimeEnvironment, signer?: string | Signer | undefined) {
  const { mockContractsDeployer, bnplTokenDeployer } = await hre.getNamedAccounts();
  const realSigner = signer || mockContractsDeployer;




  const bnplSwapMarketExample = await hre.ethers.getContract<BNPLSwapMarketExample>("BNPLSwapMarketExample", realSigner);
  await bnplSwapMarketExample.deployed();


  const DAI = await hre.ethers.getContract<IERC20>("DAI", realSigner);
  const USDT = await hre.ethers.getContract<IERC20>("USDT", realSigner);
  const USDC = await hre.ethers.getContract<IERC20>("USDC", realSigner);


  await bnplSwapMarketExample.setBNPLPrice(DAI.address, "1000000000000000000"); // 1 DAI = 1 BNPL
  await bnplSwapMarketExample.setBNPLPrice(USDT.address, "1000000"); // 1 USDT = 1 BNPL
  await bnplSwapMarketExample.setBNPLPrice(USDC.address, "1000000"); // 1 USDC = 1 BNPL

  await DAI.approve(bnplSwapMarketExample.address, "50000000000000000000000000");
  await bnplSwapMarketExample.depositToken(DAI.address, "50000000000000000000000000"); // 50,000,000 DAI

  await USDT.approve(bnplSwapMarketExample.address, "50000000000000");
  await bnplSwapMarketExample.depositToken(USDT.address, "50000000000000"); // 50,000,000 USDT

  await USDC.approve(bnplSwapMarketExample.address, "50000000000000");
  await bnplSwapMarketExample.depositToken(USDC.address, "50000000000000"); // 50,000,000 USDC
  const bnplToken = await getContractForEnvironment<BNPLToken>(hre, "BNPLToken", bnplTokenDeployer);

  await bnplToken.approve(bnplSwapMarketExample.address, "50000000000000000000000000");
  const bnplSwapMarketExampleBNPLTokenDeployer = await hre.ethers.getContract<BNPLSwapMarketExample>("BNPLSwapMarketExample", bnplTokenDeployer);
  await bnplSwapMarketExampleBNPLTokenDeployer.depositBNPL("50000000000000000000000000");// 50,000,000 BNPL
}

async function setupMockEnvIfNeeded(hre: HardhatRuntimeEnvironment) {
  if (shouldSetupFakeAave((hre))) {
    await setupFakeAave(hre);
  }
  if (shouldSetupFakeUniswap((hre))) {
    await setupFakeUniswap(hre);
  }
}

export {
  shouldSetupFakeAave,
  shouldSetupFakeUniswap,
  setupFakeUniswap,
  setupFakeAave,
  setupMockEnvIfNeeded,
}
