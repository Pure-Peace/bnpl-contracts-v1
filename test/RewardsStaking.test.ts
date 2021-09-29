import { expect } from './chai-setup';
import * as hre from 'hardhat';
import { deployments, ethers, getNamedAccounts, getUnnamedAccounts } from 'hardhat';

import { BankNodeLendingRewards, BankNodeManager, BNPLProtocolConfig, BNPLToken, IAaveLendingPool, IERC20 } from '../typechain';
import { setupUser, setupUsers, setupUsersWithNames } from './utils';
import { setupMockEnvIfNeeded } from './utils/setupMockEnv';
import { setupProtocol } from './utils/protocolSetup';
import { getContractForEnvironment } from './utils/getContractForEnvironment';
import { setupTokenBalancesConfig } from './utils/setupTokenBalances';
import { addLendableTokens } from './utils/addLendableTokens';
import { getBankNodeContractsForUsers } from './utils/BankNode';
import { BigNumber } from '@ethersproject/bignumber';
import { BankNodeHelper, IBankNodeFinancialState, ILoanRequest } from './utils/BankNode/helper';
import { ms } from '../utils/math';

const TEN_18 = BigNumber.from("10").pow(18);
const TEN_6 = BigNumber.from("10").pow(6);

const setup = deployments.createFixture(async () => {
  await deployments.fixture('BNPLProtocolDeploy');
  const { protocolAdmin, protocolDeployer } = await getNamedAccounts();
  await setupMockEnvIfNeeded(hre);

  await setupProtocol(hre);

  await addLendableTokens(hre);

  await setupTokenBalancesConfig(hre, {
    "bankNodeMakerA": { BNPLToken: ms`1000000*10^18` },
    "bankNodeMakerB": { BNPLToken: ms`1000000*10^18` },
    "bankNodeMakerC": { BNPLToken: ms`1000000*10^18` },

    "lenderA1": { DAI: ms`500000*10^18` },
    "lenderA2": { DAI: ms`1000000*10^18` },

    "borrowerA1": { DAI: "5000000000000000000000" },
    "borrowerA2": { DAI: "5000000000000000000000" },

    "stakerA1": { BNPLToken: ms`1000000*10^18` },
    "stakerA2": { BNPLToken: ms`1000000*10^18` },
    "stakerA3": { BNPLToken: ms`1000000*10^18` },


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

  const h = await BankNodeHelper(hre);
  return {
    ...contracts,
    users,
    h,

  };
});

describe('RewardsStaking', function () {
  it('3 bank nodes distrobution ', async function () {
    const { users, h } = await setup();
    const u = users;

    const bankNodeIdA = await h.setupBankNode(
      u.bankNodeMakerA,
      "DAI",
      ms`100000*10^18`,
      "Test Node A",
      "https://test-node-a.example.com"
    );
    const bA = await h.stakeBNPLToBankNode(u.stakerA1, bankNodeIdA, ms`50000*10^18`);
    await h.stakeBNPLToBankNode(u.stakerA2, bankNodeIdA, ms`100000*10^18`);

    expect(
      (await bA.b.BNPLToken.balanceOf(bA.b.StakingPool.address)).eq(ms`380000*10^18`),
      "Node A should have 250,000 BNPL Staked/Bonded"
    );


    // node a total = 250k bnpl staked



    const bankNodeIdB = await h.setupBankNode(
      u.bankNodeMakerB,
      "DAI",
      ms`300000*10^18`,
      "Test Node B",
      "https://test-node-b.example.com"
    );
    const bB = await h.stakeBNPLToBankNode(u.stakerB1, bankNodeIdB, ms`10000*10^18`);
    await h.stakeBNPLToBankNode(u.stakerB2, bankNodeIdB, ms`50000*10^18`);

    expect(
      (await bB.b.BNPLToken.balanceOf(bB.b.StakingPool.address)).eq(ms`360000*10^18`),
      "Node B should have 360,000 BNPL Staked/Bonded"
    );
    const bankNodeIdC = await h.setupBankNode(
      u.bankNodeMakerC,
      "USDT",
      ms`220000*10^18`,
      "Test Node C",
      "https://test-node-c.example.com"
    );
    const bC = await h.stakeBNPLToBankNode(u.stakerC1, bankNodeIdC, ms`10000*10^18`);
    await h.stakeBNPLToBankNode(u.stakerC2, bankNodeIdC, ms`50000*10^18`);

    expect(
      (await bC.b.BNPLToken.balanceOf(bC.b.StakingPool.address)).eq(ms`380000*10^18`),
      "Node C should have 360,000 BNPL Staked/Bonded"
    );

    const totalAmountToDistribute = ms`1000*1000*10*10^18`;

    const totalForNodes = [
      await bA.b.BNPLToken.balanceOf(bA.b.StakingPool.address),
      await bB.b.BNPLToken.balanceOf(bB.b.StakingPool.address),
      await bC.b.BNPLToken.balanceOf(bC.b.StakingPool.address),
    ];
    const totalForAllNodes = totalForNodes.reduce((a, b) => a.add(b));
    const nodesNormalized = totalForNodes.map(x => x.mul(totalAmountToDistribute).div(totalForAllNodes));
    const totalForNormalizedNodes = nodesNormalized.reduce((a, b) => a.add(b));

    const allFromChainCalc = await bC.b.BankNodeLendingRewards.getBNPLTokenDistribution(totalAmountToDistribute);
    const totalForAllNodesFromChain = allFromChainCalc.reduce((a, b) => a.add(b));

    expect(totalForNormalizedNodes.toString(), "total for all nodes should equal to the total produced on chain")
      .equal(totalForAllNodesFromChain.toString());

    for (let i = 0; i < totalForNodes.length; i++) {
      expect(nodesNormalized[i].toString(), `Node ${String.fromCharCode(65 + i)} total calculated off chain should match the on chain calculation`)
        .equal(allFromChainCalc[i].toString());
    }


  });
});
export {
  setup,
}
