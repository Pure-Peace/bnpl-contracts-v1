import { Signer, Contract, ethers } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { BNPLSwapMarketExample, BNPLToken, FakeAaveLendingPool, IERC20 } from "../../typechain";
import { genGetContractWith } from "./genHelpers";
import { getContractForEnvironment } from "./getContractForEnvironment";
import { ms } from '../../utils/math';

function shouldSetupFakeAave(hre: HardhatRuntimeEnvironment) {
  return !hre.network.live;
}
function shouldSetupFakeUniswap(hre: HardhatRuntimeEnvironment) {
  return !hre.network.live;
}

async function setupFakeAave(hre: HardhatRuntimeEnvironment, signer?: string | Signer | undefined) {
  const { getContract } = genGetContractWith(hre);


  const DAI = await getContract("DAI", signer);
  const aDAI = await getContract("aDAI", signer);

  const USDT = await getContract("USDT", signer);
  const aUSDT = await getContract("aUSDT", signer);

  const USDC = await getContract("USDC", signer);
  const aUSDC = await getContract("aUSDC", signer);
  const { mockContractsDeployer } = await hre.getNamedAccounts();

  const fakeAaveLendingPool = await getContract<FakeAaveLendingPool>("FakeAaveLendingPool", signer || mockContractsDeployer);
  //await fakeAaveLendingPool.deployed();


  const r = await fakeAaveLendingPool.addAssetPair(DAI.address, aDAI.address);
  await fakeAaveLendingPool.addAssetPair(USDT.address, aUSDT.address);
  await fakeAaveLendingPool.addAssetPair(USDC.address, aUSDC.address);

}
async function setupFakeUniswap(hre: HardhatRuntimeEnvironment, signer?: string | Signer | undefined) {
  const { mockContractsDeployer, bnplTokenDeployer } = await hre.getNamedAccounts();
  const realSigner = signer || mockContractsDeployer;
  const { getContract } = genGetContractWith(hre);




  const bnplSwapMarketExample = await getContract<BNPLSwapMarketExample>("BNPLSwapMarketExample", realSigner);


  const DAI = await getContract<IERC20>("DAI", realSigner);
  const USDT = await getContract<IERC20>("USDT", realSigner);
  const USDC = await getContract<IERC20>("USDC", realSigner);


  await bnplSwapMarketExample.setBNPLPrice(DAI.address, ms`10^18`); // 1 DAI = 1 BNPL
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
  const bnplSwapMarketExampleBNPLTokenDeployer = await getContract<BNPLSwapMarketExample>("BNPLSwapMarketExample", bnplTokenDeployer);
  await bnplSwapMarketExampleBNPLTokenDeployer.depositBNPL("50000000000000000000000000");// 50,000,000 BNPL
}

async function setupMockEnvIfNeeded(hre: HardhatRuntimeEnvironment) {
  const { protocolDeployer } = await hre.getNamedAccounts();

  if (shouldSetupFakeAave((hre))) {
    await setupFakeAave(hre, protocolDeployer);
  }
  if (shouldSetupFakeUniswap((hre))) {
    await setupFakeUniswap(hre, protocolDeployer);
  }
}

export {
  shouldSetupFakeAave,
  shouldSetupFakeUniswap,
  setupFakeUniswap,
  setupFakeAave,
  setupMockEnvIfNeeded,
}
