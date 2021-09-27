import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { BNPLSwapMarketExample, BNPLToken, FakeAaveLendingPool, IAaveLendingPool, IERC20 } from '../typechain';
import { getContractForEnvironment } from '../test/utils/getContractForEnvironment';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const ethers = hre.ethers;
  const { deployer, bnplTokenDeployer, mockContractsDeployer, } = await hre.getNamedAccounts();
  const { deploy, get, execute } = hre.deployments;
  const shouldDeployFakeSwapMarket = !hre.network.live;


  if (shouldDeployFakeSwapMarket) {
    const DAI = await deploy('DAI', {
      contract: "FakeUSDToken",
      from: mockContractsDeployer,
      args: ["FAKE DAI", "DAI", 18],
      log: true,
      skipIfAlreadyDeployed: false,
    });

    const aDAI = await deploy('aDAI', {
      contract: "FakeUSDToken",
      from: mockContractsDeployer,
      args: ["FAKE aDAI", "aDAI", 18],
      log: true,
      skipIfAlreadyDeployed: false,
    });

    const USDT = await deploy('USDT', {
      contract: "FakeUSDToken",
      from: mockContractsDeployer,
      args: ["FAKE USDT", "USDT", 6],
      log: true,
      skipIfAlreadyDeployed: false,
    });

    const aUSDT = await deploy('aUSDT', {
      contract: "FakeUSDToken",
      from: mockContractsDeployer,
      args: ["FAKE aUSDT", "aUSDT", 6],
      log: true,
      skipIfAlreadyDeployed: false,
    });

    const USDC = await deploy('USDC', {
      contract: "FakeUSDToken",
      from: mockContractsDeployer,
      args: ["FAKE USDC", "USDC", 6],
      log: true,
      skipIfAlreadyDeployed: false,
    });

    const aUSDC = await deploy('aUSDC', {
      contract: "FakeUSDToken",
      from: mockContractsDeployer,
      args: ["FAKE aUSDC", "aUSDC", 6],
      log: true,
      skipIfAlreadyDeployed: false,
    });

    const FakeAaveLendingPool = await deploy('FakeAaveLendingPool', {
      from: mockContractsDeployer,
      log: true,
      skipIfAlreadyDeployed: false,
    });

    const fakeAaveLendingPool = await ethers.getContractAt<FakeAaveLendingPool>("FakeAaveLendingPool", FakeAaveLendingPool.address, mockContractsDeployer);
    await fakeAaveLendingPool.deployed();

    await fakeAaveLendingPool.addAssetPair(DAI.address, aDAI.address);
    await fakeAaveLendingPool.addAssetPair(USDT.address, aUSDT.address);
    await fakeAaveLendingPool.addAssetPair(USDC.address, aUSDC.address);

    // end deploy fake lending pool


    const bnplToken = await getContractForEnvironment<BNPLToken>(hre, "BNPLToken", bnplTokenDeployer);




    const BNPLSwapMarketExample = await deploy('BNPLSwapMarketExample', {
      from: mockContractsDeployer,
      log: true,
      args: [bnplToken.address],
      skipIfAlreadyDeployed: false,
    });

    const bnplSwapMarketExample = await ethers.getContract<BNPLSwapMarketExample>("BNPLSwapMarketExample", mockContractsDeployer);
    await bnplSwapMarketExample.deployed();


    await bnplSwapMarketExample.setBNPLPrice(DAI.address, "1000000000000000000"); // 1 DAI = 1 BNPL
    await bnplSwapMarketExample.setBNPLPrice(USDT.address, "1000000"); // 1 USDT = 1 BNPL
    await bnplSwapMarketExample.setBNPLPrice(USDC.address, "1000000"); // 1 USDC = 1 BNPL

    await (await ethers.getContract<IERC20>("DAI", mockContractsDeployer)).approve(bnplSwapMarketExample.address, "50000000000000000000000000");
    await bnplSwapMarketExample.depositToken(DAI.address, "50000000000000000000000000"); // 50,000,000 DAI

    await (await ethers.getContract<IERC20>("USDT", mockContractsDeployer)).approve(bnplSwapMarketExample.address, "50000000000000");
    await bnplSwapMarketExample.depositToken(USDT.address, "50000000000000"); // 50,000,000 USDT

    await (await ethers.getContract<IERC20>("USDC", mockContractsDeployer)).approve(bnplSwapMarketExample.address, "50000000000000");
    await bnplSwapMarketExample.depositToken(USDC.address, "50000000000000"); // 50,000,000 USDC

    await bnplToken.approve(bnplSwapMarketExample.address, "50000000000000000000000000");
    const bnplSwapMarketExampleBNPLTokenDeployer = await ethers.getContract<BNPLSwapMarketExample>("BNPLSwapMarketExample", bnplTokenDeployer);
    await bnplSwapMarketExampleBNPLTokenDeployer.depositBNPL("50000000000000000000000000");// 50,000,000 BNPL

  }


  /*



    // proxy only in non-live network (localhost and hardhat network) enabling HCR (Hot Contract Replacement)
    // in live network, proxy is disabled and constructor is invoked

    if (shouldDeployFakeSwapMarket) {
      const bnplToken =
      ethers.getContract<BNPLToken>("BNPLToken")

      const bnplSwapMarketExample = await deploy('BNPLSwapMarketExample', {
        from: deployer,
        proxy: useProxy && 'postUpgrade',
        args: [2],
        log: true,
      });
      await execute("ApproveToSwapMarket",)
    }

    return !useProxy; // when live network, record the script as executed to prevent rexecution
    */
};
export default func;
func.id = 'deploy_fake_testnet_mocks'; // id required to prevent reexecution
func.tags = ['DeployFakeTestnetMocks'];
