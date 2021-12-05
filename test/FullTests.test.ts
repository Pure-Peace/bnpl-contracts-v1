import { expect } from 'chai';
import * as hre from 'hardhat';
import { deployments, ethers, getNamedAccounts, getUnnamedAccounts } from 'hardhat';
import { BankNodeLendingRewards, BankNodeManager, BNPLProtocolConfig, BNPLToken, IAaveLendingPool, IERC20 } from '../typechain';
import { setupUser, setupUsers, setupUsersWithNames } from './utils';
import { setupMockEnvIfNeeded } from './utils/setupMockEnv';
import { setupProtocol } from './utils/protocolSetup';
import { getContractForEnvironment } from './utils/getContractForEnvironment';
import { setupTokenBalancesConfig } from './utils/setupTokenBalances';
import { addLendableTokens } from './utils/addLendableTokens';

const setup = deployments.createFixture(async () => {
  await deployments.fixture('BNPLProtocolDeploy');
  await deployments.fixture('BNPLProtocolDeployEco');
  const { protocolAdmin, protocolDeployer } = await getNamedAccounts();
  await setupMockEnvIfNeeded(hre);

  await setupProtocol(hre);

  await addLendableTokens(hre);


  await setupTokenBalancesConfig(hre, {
    "bankNodeMakerA": { BNPLToken: "500000000000000000000000" },
    "bankNodeMakerB": { BNPLToken: "500000000000000000000000" },
    "bankNodeMakerC": { BNPLToken: "100000000000000000000000" },

    "lenderA1": { DAI: "100000000000000000000000" },
    "lenderA2": { DAI: "100000000000000000000000" },

    "stakerA1": { BNPLToken: "100000000000000000000000" },
    "stakerA2": { BNPLToken: "200000000000000000000000" },
    "stakerA3": { BNPLToken: "300000000000000000000000" },


    "lenderB1": { DAI: "100000000000000000000000" },
    "lenderB2": { DAI: "100000000000000000000000" },

    "stakerB1": { BNPLToken: "100000000000000000000000" },
    "stakerB2": { BNPLToken: "200000000000000000000000" },
    "stakerB3": { BNPLToken: "300000000000000000000000" },


    "lenderC1": { USDT: "100000000000000000000000" },
    "lenderC2": { USDT: "100000000000000000000000" },

    "stakerC1": { BNPLToken: "100000000000000000000000" },
    "stakerC2": { BNPLToken: "200000000000000000000000" },
    "stakerC3": { BNPLToken: "300000000000000000000000" },

  })

  const contracts = {
    BNPLToken: await getContractForEnvironment<BNPLToken>(hre, "BNPLToken"),
    BNPLProtocolConfig: await getContractForEnvironment<BNPLProtocolConfig>(hre, "BNPLProtocolConfig"),
    BankNodeManager: await getContractForEnvironment<BankNodeManager>(hre, "BankNodeManager"),
    BankNodeLendingRewards: await getContractForEnvironment<BankNodeLendingRewards>(hre, "BankNodeLendingRewards"),
    AaveLendingPool: await getContractForEnvironment<IAaveLendingPool>(hre, "AaveLendingPool"),
    DAI: await getContractForEnvironment<IERC20>(hre, "DAI"),
    USDT: await getContractForEnvironment<IERC20>(hre, "USDT"),
    USDC: await getContractForEnvironment<IERC20>(hre, "USDC"),
  };

  const users = await setupUsersWithNames(await getNamedAccounts() as any, contracts);

  return {
    ...contracts,
    users,

  };
});

describe('FullTests', function () {


  it('create node a', async function () {
    const { users, BNPLToken, DAI, BankNodeManager } = await setup();

    await users.bankNodeMakerA.BNPLToken.approve(
      BankNodeManager.address,
      "100000000000000000000000"
    );
    const bankNodeAId = await users.bankNodeMakerA.BankNodeManager.callStatic.createBondedBankNode(
      users.bankNodeMakerA.address,
      "100000000000000000000000",
      DAI.address,
      "My First Node!",
      "https://node1.isthebest",
      "https://node1.com/config.json",
      "0x38a449a43d7af4acbb4446e2984009bae0646b6b",
      "0"
    );
    expect((bankNodeAId + ""), "bank node id should be 1").to.equal("1");

    await users.bankNodeMakerA.BankNodeManager.createBondedBankNode(
      users.bankNodeMakerA.address,
      "100000000000000000000000",
      DAI.address,
      "My First Node!",
      "https://nodeA.isthebest",
      "https://node1.com/config.json",
      "0x38a449a43d7af4acbb4446e2984009bae0646b6b",
      "0"
    );
    const bankNodeADef = BankNodeManager.bankNodes(bankNodeAId);



  });
});
