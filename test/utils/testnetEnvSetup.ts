
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployedContract, DeployFunction } from 'hardhat-deploy/types';
import { getContractForEnvironment } from './getContractForEnvironment';
import { BankNodeLendingRewards, BankNodeManager, BNPLProtocolConfig, BNPLToken, IAaveLendingPool, IERC20 } from '../../typechain';
import { setupMockEnvTestNet } from './setupMockEnv';
import { setupProtocolTestNet } from './protocolSetup';
import { addLendableTokensTestNet } from './addLendableTokens';
import { setupTokenBalancesConfig } from './setupTokenBalances';
import { setupUsersWithNames } from '.';
import { BankNodeHelper } from './BankNode/helper';


async function setupTestEnv(hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { protocolDeployer, bnplTokenDeployer, protocolAdmin } = await getNamedAccounts();
  console.log("setting up mock env on network: " + hre.network.name);
  await setupMockEnvTestNet(hre, protocolDeployer);

  await setupProtocolTestNet(hre);

  await addLendableTokensTestNet(hre);
  console.log(await getNamedAccounts())




  await setupTokenBalancesConfig(hre, {
    "bankNodeMakerA": { BNPLToken: "9000000000000000000000000", "USDT": "100000000000000000000000000" },

    "lenderA1": { USDT: "100000000000000000000000" },
    "lenderA2": { USDT: "100000000000000000000000" },

    "borrowerA1": { USDT: "5000000000000000000000" },
    "borrowerA2": { USDT: "5000000000000000000000" },

    "stakerA1": { BNPLToken: "8000000000000000000000000" },
    "stakerA2": { BNPLToken: "2000000000000000000000000" },
    "stakerA3": { BNPLToken: "1000000000000000000000000" },
  })



  const contracts = {
    BNPLToken: await getContractForEnvironment<BNPLToken>(hre, "BNPLToken"),
    BNPLProtocolConfig: await getContractForEnvironment<BNPLProtocolConfig>(hre, "BNPLProtocolConfig"),
    BankNodeManager: await getContractForEnvironment<BankNodeManager>(hre, "BankNodeManager"),
    BankNodeLendingRewards: await getContractForEnvironment<BankNodeLendingRewards>(hre, "BankNodeLendingRewards"),
    AaveLendingPool: await getContractForEnvironment<IAaveLendingPool>(hre, "AaveLendingPool"),
    USDT: await getContractForEnvironment<IERC20>(hre, "USDT"),
  };

  const users = await setupUsersWithNames(await getNamedAccounts() as any, contracts);

  const h = await BankNodeHelper(hre);
  return {
    ...contracts,
    users,
    h,

  };


}


export {
  setupTestEnv,
}
