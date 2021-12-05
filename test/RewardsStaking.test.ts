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
  await deployments.fixture('BNPLProtocolDeployEco');
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
  it('3 bank nodes distribution values ', async function () {
    const { users, h } = await setup();
    const u = users;

    const bankNodeIdA = await h.setupBankNode(
      u.bankNodeMakerA,
      "DAI",
      ms`100000*10^18`,
      "Test Node A",
      "https://test-node-a.example.com",
      "https://test-node-b.example.com/configa.json",
      "0x38a449a43d7af4acbb4446e2984009bae0646b6b",
      "0"
    );
    const bA = await h.stakeBNPLToBankNode(u.stakerA1, bankNodeIdA, ms`50000*10^18`);
    await h.stakeBNPLToBankNode(u.stakerA2, bankNodeIdA, ms`100000*10^18`);

    expect(
      (await bA.b.BNPLToken.balanceOf(bA.b.StakingPool.address)).eq(ms`250000*10^18`),
      "Node A should have 250,000 BNPL Staked/Bonded"
    );


    // node a total = 250k bnpl staked



    const bankNodeIdB = await h.setupBankNode(
      u.bankNodeMakerB,
      "DAI",
      ms`300000*10^18`,
      "Test Node B",
      "https://test-node-b.example.com",
      "https://test-node-b.example.com/configb.json",
      "0x38a449a43d7af4acbb4446e2984009bae0646b6b",
      "0"
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
      "https://test-node-c.example.com",
      "https://test-node-b.example.com/configc.json",
      "0x38a449a43d7af4acbb4446e2984009bae0646b6b",
      "0"
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
    //console.log("balances: ", totalForNodes.map(x => x.toString()))
    const totalForAllNodes = totalForNodes.reduce((a, b) => a.add(b));
    //console.log("total bnpl staked across all three: ", totalForAllNodes.toString());
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



    //console.log("chain calculation distribution", allFromChainCalc.map(x => x.toString()))


  });
  it('3 bank nodes distribution ', async function () {
    const { users, h } = await setup();
    const u = users;

    const bankNodeIdA = await h.setupBankNode(
      u.bankNodeMakerA,
      "DAI",
      ms`100000*10^18`,
      "Test Node A",
      "https://test-node-a.example.com",
      "https://test-node-b.example.com/configa.json",
      "0x38a449a43d7af4acbb4446e2984009bae0646b6b",
      "0"
    );
    const bA = await h.stakeBNPLToBankNode(u.stakerA1, bankNodeIdA, ms`50000*10^18`);
    await h.stakeBNPLToBankNode(u.stakerA2, bankNodeIdA, ms`100000*10^18`);

    expect(
      (await bA.b.BNPLToken.balanceOf(bA.b.StakingPool.address)).eq(ms`380000*10^18`),
      "Node A should have 250,000 BNPL Staked/Bonded"
    );

    await h.stakeLendingCoinToBankNode(u.lenderA1, bankNodeIdA, ms`100000*10^18`, "DAI");
    await h.stakeLendingCoinToBankNode(u.lenderA2, bankNodeIdA, ms`50000*10^18`, "DAI");

    const nodeALendingPoolCoinBalancesPreRewards = [
      await bA.b.PoolLiquidityToken.balanceOf(u.lenderA1.address),
      await bA.b.PoolLiquidityToken.balanceOf(u.lenderA2.address),
    ];


    await h.stakeAllBankNodePoolTokensToRewards(u.lenderA1, bankNodeIdA, ms`100000*10^18`);
    await h.stakeAllBankNodePoolTokensToRewards(u.lenderA2, bankNodeIdA, ms`50000*10^18`);

    expect(
      bA.b.PoolLiquidityToken.balanceOf(u.lenderA1.address),
      "A1 Lending Pool Token Balance should be 0 after staking to the rewards pool"
    ).eventually.equal(BigNumber.from(0));
    expect(
      bA.b.PoolLiquidityToken.balanceOf(u.lenderA2.address),
      "A2 Lending Pool Token Balance should be 0 after staking to the rewards pool"
    ).eventually.equal(BigNumber.from(0));


    // node a total = 250k bnpl staked



    const bankNodeIdB = await h.setupBankNode(
      u.bankNodeMakerB,
      "DAI",
      ms`300000*10^18`,
      "Test Node B",
      "https://test-node-b.example.com",
      "https://test-node-b.example.com/configb.json",
      "0x38a449a43d7af4acbb4446e2984009bae0646b6b",
      "0"
    );
    const bB = await h.stakeBNPLToBankNode(u.stakerB1, bankNodeIdB, ms`10000*10^18`);
    await h.stakeBNPLToBankNode(u.stakerB2, bankNodeIdB, ms`50000*10^18`);

    expect(
      (await bB.b.BNPLToken.balanceOf(bB.b.StakingPool.address)).eq(ms`360000*10^18`),
      "Node B should have 360,000 BNPL Staked/Bonded"
    );

    await h.stakeLendingCoinToBankNode(u.lenderB1, bankNodeIdB, ms`100000*10^18`, "DAI");
    await h.stakeLendingCoinToBankNode(u.lenderB2, bankNodeIdB, ms`50000*10^18`, "DAI");

    const nodeBLendingPoolCoinBalancesPreRewards = [
      await bB.b.PoolLiquidityToken.balanceOf(u.lenderB1.address),
      await bB.b.PoolLiquidityToken.balanceOf(u.lenderB2.address),
    ];

    await h.stakeAllBankNodePoolTokensToRewards(u.lenderB1, bankNodeIdB, ms`100000*10^18`);
    await h.stakeAllBankNodePoolTokensToRewards(u.lenderB2, bankNodeIdB, ms`50000*10^18`);



    expect(
      bB.b.PoolLiquidityToken.balanceOf(u.lenderB1.address),
      "B1 Lending Pool Token Balance should be 0 after staking to the rewards pool"
    ).eventually.equal(BigNumber.from(0));
    expect(
      bB.b.PoolLiquidityToken.balanceOf(u.lenderB2.address),
      "B2 Lending Pool Token Balance should be 0 after staking to the rewards pool"
    ).eventually.equal(BigNumber.from(0));


    const bankNodeIdC = await h.setupBankNode(
      u.bankNodeMakerC,
      "USDT",
      ms`220000*10^18`,
      "Test Node C",
      "https://test-node-c.example.com",
      "https://test-node-c.example.com/configc.json",
      "0x38a449a43d7af4acbb4446e2984009bae0646b6b",
      "0"
    );
    const bC = await h.stakeBNPLToBankNode(u.stakerC1, bankNodeIdC, ms`10000*10^18`);
    await h.stakeBNPLToBankNode(u.stakerC2, bankNodeIdC, ms`50000*10^18`);

    expect(
      (await bC.b.BNPLToken.balanceOf(bC.b.StakingPool.address)).eq(ms`380000*10^18`),
      "Node C should have 360,000 BNPL Staked/Bonded"
    );

    await h.stakeLendingCoinToBankNode(u.lenderC1, bankNodeIdC, ms`100000*10^18`, "USDT");
    await h.stakeLendingCoinToBankNode(u.lenderC2, bankNodeIdC, ms`50000*10^18`, "USDT");

    const nodeCLendingPoolCoinBalances = [
      await bC.b.PoolLiquidityToken.balanceOf(u.lenderC1.address),
      await bC.b.PoolLiquidityToken.balanceOf(u.lenderC2.address),
    ];


    await h.stakeAllBankNodePoolTokensToRewards(u.lenderC1, bankNodeIdC, ms`100000*10^18`);
    await h.stakeAllBankNodePoolTokensToRewards(u.lenderC2, bankNodeIdC, ms`50000*10^18`);


    expect(
      bC.b.PoolLiquidityToken.balanceOf(u.lenderC1.address),
      "C1 Lending Pool Token Balance should be 0 after staking to the rewards pool"
    ).eventually.equal(BigNumber.from(0));
    expect(
      bC.b.PoolLiquidityToken.balanceOf(u.lenderC2.address),
      "C2 Lending Pool Token Balance should be 0 after staking to the rewards pool"
    ).eventually.equal(BigNumber.from(0));


    const totalAmountToDistribute = ms`1000*10*10^18`;

    const totalForNodes = [
      await bA.b.BNPLToken.balanceOf(bA.b.StakingPool.address),
      await bB.b.BNPLToken.balanceOf(bB.b.StakingPool.address),
      await bC.b.BNPLToken.balanceOf(bC.b.StakingPool.address),
    ];
    const totalForAllNodes = totalForNodes.reduce((a, b) => a.add(b));
    const nodesNormalized = totalForNodes.map(x => x.mul(totalAmountToDistribute).div(totalForAllNodes));
    const totalForNormalizedNodes = nodesNormalized.reduce((a, b) => a.add(b));

    const allFromChainCalc = await bC.b.BankNodeLendingRewards.getBNPLTokenDistribution(totalAmountToDistribute);
    //console.log("allFromChainCalc", allFromChainCalc.map(x => x.toString()))
    const totalForAllNodesFromChain = allFromChainCalc.reduce((a, b) => a.add(b));

    //console.log("totalForAllNodesFromChain", totalForAllNodesFromChain.toString());

    expect(totalForNormalizedNodes.toString(), "total for all nodes should equal to the total produced on chain")
      .equal(totalForAllNodesFromChain.toString());

    for (let i = 0; i < totalForNodes.length; i++) {
      expect(nodesNormalized[i].toString(), `Node ${String.fromCharCode(65 + i)} total calculated off chain should match the on chain calculation`)
        .equal(allFromChainCalc[i].toString());
    }
    await h.sendToken(u.protocolAdmin, "BNPLToken", totalAmountToDistribute, u.bnplTokenDeployer);

    await u.protocolAdmin.BNPLToken.approve(u.protocolAdmin.BankNodeLendingRewards.address, totalAmountToDistribute);

    await h.setupBankNode(
      u.bankNodeMakerA,
      "DAI",
      ms`100000*10^18`,
      "Test Node DD",
      "https://test-node-a.example.com",
      "https://test-node-a.example.com/configdd.json",
      "0x38a449a43d7af4acbb4446e2984009bae0646b6b",
      "0"
    );
    await u.protocolAdmin.BankNodeLendingRewards.distributeBNPLTokensToBankNodes(totalAmountToDistribute);


    await u.lenderA1.BankNodeLendingRewards.exit(bankNodeIdA);
    await u.lenderA2.BankNodeLendingRewards.exit(bankNodeIdA);


    await u.lenderB1.BankNodeLendingRewards.exit(bankNodeIdB);
    await u.lenderB2.BankNodeLendingRewards.exit(bankNodeIdB);


    await u.lenderC1.BankNodeLendingRewards.exit(bankNodeIdC);
    await u.lenderC2.BankNodeLendingRewards.exit(bankNodeIdC);


    const endBalancesNodeA = [
      await h.getKeyUserBalancesForBankNode(u.lenderA1, bankNodeIdA),
      await h.getKeyUserBalancesForBankNode(u.lenderA2, bankNodeIdA),
    ]


    const endBalancesNodeB = [
      await h.getKeyUserBalancesForBankNode(u.lenderB1, bankNodeIdB),
      await h.getKeyUserBalancesForBankNode(u.lenderB2, bankNodeIdB),
    ]

    const endBalancesNodeC = [
      await h.getKeyUserBalancesForBankNode(u.lenderC1, bankNodeIdC),
      await h.getKeyUserBalancesForBankNode(u.lenderC2, bankNodeIdC),
    ];

    /*
        const totalActuallyRewardedToNodeALenders = endBalancesNodeA.map(x => x.bnplTokenBalance).reduce((a, b) => a.add(b));
        const totalActuallyRewardedToNodeBLenders = endBalancesNodeB.map(x => x.bnplTokenBalance).reduce((a, b) => a.add(b));
        const totalActuallyRewardedToNodeCLenders = endBalancesNodeC.map(x => x.bnplTokenBalance).reduce((a, b) => a.add(b));
    */
    //console.log(totalActuallyRewardedToNodeALenders.toString(), totalActuallyRewardedToNodeBLenders.toString(), totalActuallyRewardedToNodeCLenders.toString());
    //console.log("sum: ", totalActuallyRewardedToNodeALenders.add(totalActuallyRewardedToNodeBLenders).add(totalActuallyRewardedToNodeCLenders).toString());
    /*

        expect(
          totalActuallyRewardedToNodeALenders,
          "Sum of real end balances A should match the calculated amount rewarded to A"
        ).equals(allFromChainCalc[0]);
        expect(
          totalActuallyRewardedToNodeBLenders,
          "Sum of real end balances B should match the calculated amount rewarded to B"
        ).equals(allFromChainCalc[1]);
        expect(
          totalActuallyRewardedToNodeCLenders,
          "Sum of real end balances C should match the calculated amount rewarded to C"
        ).equals(allFromChainCalc[2]);

        */



  });
});
export {
  setup,
}
