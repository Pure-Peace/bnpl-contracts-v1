import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { BNPLSwapMarketExample, BNPLToken, FakeAaveLendingPool, IAaveLendingPool, IERC20 } from '../typechain';
import { getContractForEnvironment } from '../test/utils/getContractForEnvironment';
import { shouldSetupFakeAave, shouldSetupFakeUniswap } from '../test/utils/setupMockEnv';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { bnplTokenDeployer, mockContractsDeployer, } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;


  if (shouldSetupFakeAave(hre)) {
    const DAI = await deploy('DAI', {
      contract: "FakeUSDToken",
      from: mockContractsDeployer,
      args: ["FAKE DAI", "DAI", 18],
      log: true,
    });

    const aDAI = await deploy('aDAI', {
      contract: "FakeUSDToken",
      from: mockContractsDeployer,
      args: ["FAKE aDAI", "aDAI", 18],
      log: true,
    });

    const USDT = await deploy('USDT', {
      contract: "FakeUSDToken",
      from: mockContractsDeployer,
      args: ["FAKE USDT", "USDT", 6],
      log: true,
    });

    const aUSDT = await deploy('aUSDT', {
      contract: "FakeUSDToken",
      from: mockContractsDeployer,
      args: ["FAKE aUSDT", "aUSDT", 6],
      log: true,
    });

    const USDC = await deploy('USDC', {
      contract: "FakeUSDToken",
      from: mockContractsDeployer,
      args: ["FAKE USDC", "USDC", 6],
      log: true,
    });

    const aUSDC = await deploy('aUSDC', {
      contract: "FakeUSDToken",
      from: mockContractsDeployer,
      args: ["FAKE aUSDC", "aUSDC", 6],
      log: true,
    });

    const FakeAaveLendingPool = await deploy('FakeAaveLendingPool', {
      from: mockContractsDeployer,
      log: true,
    });
  }
  if (shouldSetupFakeUniswap(hre)) {
    const bnplToken = await getContractForEnvironment<BNPLToken>(hre, "BNPLToken", bnplTokenDeployer);
    const BNPLSwapMarketExample = await deploy('BNPLSwapMarketExample', {
      from: mockContractsDeployer,
      log: true,
      args: [bnplToken.address],
    });
  }



};
export default func;
func.id = 'deploy_fake_testnet_mocks'; // id required to prevent reexecution
func.tags = ['DeployFakeTestnetMocks'];
