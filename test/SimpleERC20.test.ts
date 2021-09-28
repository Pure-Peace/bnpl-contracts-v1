import { expect } from './chai-setup';
import * as hre from 'hardhat';
import { deployments, ethers, getNamedAccounts, getUnnamedAccounts } from 'hardhat';
import { BankNodeLendingRewards, BankNodeManager, BNPLProtocolConfig, BNPLToken, IAaveLendingPool, IERC20 } from '../typechain';
import { setupUser, setupUsers } from './utils';
import { setupMockEnvIfNeeded } from './utils/setupMockEnv';
import { setupProtocol } from './utils/protocolSetup';
import { getContractForEnvironment } from './utils/getContractForEnvironment';

const setup = deployments.createFixture(async () => {
  await deployments.fixture('BNPLProtocolDeploy');
  const { protocolAdmin, protocolDeployer } = await getNamedAccounts();
  await setupMockEnvIfNeeded(hre);
  await setupProtocol(hre);

  const contracts = {
    BNPLToken: await getContractForEnvironment<BNPLToken>(hre, "BNPLToken"),
    BNPLProtocolConfig: await getContractForEnvironment<BNPLProtocolConfig>(hre, "BNPLProtocolConfig"),
    BankNodeManager: await getContractForEnvironment<BankNodeManager>(hre, "BankNodeManager"),
    BankNodeLendingRewards: await getContractForEnvironment<BankNodeLendingRewards>(hre, "BankNodeLendingRewards"),
    AaveLendingPool: await getContractForEnvironment<IAaveLendingPool>(hre, "AaveLendingPool"),

    AaveLendingPool: <IAaveLendingPool>await ethers.getContract('AaveLendingPool'),

  };
  const users = await setupUsers(await getUnnamedAccounts(), contracts);
  return {
    ...contracts,
    users,
    simpleERC20Beneficiary: await setupUser(simpleERC20Beneficiary, contracts),
  };
});

describe('SimpleERC20', function () {
  it('transfer fails', async function () {
    const { users } = await setup();
    await expect(
      users[0].SimpleERC20.transfer(users[1].address, 1)
    ).to.be.revertedWith('NOT_ENOUGH_TOKENS');
  });

  it('transfer succeed', async function () {
    const { users, simpleERC20Beneficiary, SimpleERC20 } = await setup();
    await simpleERC20Beneficiary.SimpleERC20.transfer(users[1].address, 1);

    await expect(
      simpleERC20Beneficiary.SimpleERC20.transfer(users[1].address, 1)
    )
      .to.emit(SimpleERC20, 'Transfer')
      .withArgs(simpleERC20Beneficiary.address, users[1].address, 1);
  });
});
