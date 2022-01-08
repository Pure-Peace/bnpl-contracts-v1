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
import { BankNodeHelper } from './utils/BankNode/helper';

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

  const h = await BankNodeHelper(hre);
  return {
    ...contracts,
    users,
    h,

  };
});

describe('BankNodeManager', function () {
  it('create node a', async function () {
    const { users, BNPLToken, DAI, BankNodeManager } = await setup();
    const nodeConfig = {
      tokensToBond: "100000000000000000000000",
      nodeName: "My First Node",
      website: "https://nodeA.isthebest.com",
      config: "https://nodeA.isthebest.com/config.json",
    };

    await users.bankNodeMakerA.BNPLToken.approve(
      BankNodeManager.address,
      nodeConfig.tokensToBond,
    );
    await users.bankNodeMakerA.BankNodeManager.createBondedBankNode(
      users.bankNodeMakerA.address,
      nodeConfig.tokensToBond,
      DAI.address,
      nodeConfig.nodeName,
      nodeConfig.website,
      nodeConfig.config,
      "0x38a449a43d7af4acbb4446e2984009bae0646b6b",
      "0"

    );

    const bnc = await getBankNodeContractsForUsers(hre, 1);

    await expect(bnc.bankNodeDef.nodeName)
      .eq(nodeConfig.nodeName, "BankNodeDef in BankNodeManager Should match our nodeName in the nodeConfig");

    await expect(bnc.bankNodeDef.website)
      .eq(nodeConfig.website, "BankNodeDef in BankNodeManager Should match our website in the nodeConfig");

    const loanConfig = {
      lender1Amount: TEN_18.mul(50000),
      lender2Amount: TEN_18.mul(50000),
      borrower1Amount: TEN_18.mul(60000),
      borrower2Amount: TEN_18.mul(5000),
    }
    await bnc.lenderA1.DAI.approve(bnc.lenderA1.BNPLBankNode.address, loanConfig.lender1Amount);
    await bnc.lenderA1.BNPLBankNode.addLiquidity(loanConfig.lender1Amount);

    await expect(bnc.lenderA1.BankNodeToken.balanceOf(bnc.lenderA1.address))
      .eventually
      .equals(loanConfig.lender1Amount, "balance after first deposit");

    await bnc.lenderA1.BankNodeToken.approve(bnc.lenderA1.BankNodeLendingRewards.address, loanConfig.lender1Amount);

    await bnc.lenderA1.BankNodeLendingRewards.stake(
      bnc.bankNodeDef.id,
      loanConfig.lender1Amount
    );



    await bnc.lenderA2.DAI.approve(bnc.lenderA2.BNPLBankNode.address, loanConfig.lender2Amount);
    await bnc.lenderA2.BNPLBankNode.addLiquidity(loanConfig.lender2Amount);

    await expect(bnc.lenderA2.BankNodeToken.balanceOf(bnc.lenderA2.address))
      .eventually
      .equals(loanConfig.lender2Amount, "balance after first deposit");

    await bnc.lenderA2.BankNodeToken.approve(bnc.lenderA2.BankNodeLendingRewards.address, loanConfig.lender2Amount);

    await bnc.lenderA2.BankNodeLendingRewards.stake(
      bnc.bankNodeDef.id,
      loanConfig.lender2Amount
    );


    await bnc.borrowerA1.BNPLBankNode.requestLoan(
      loanConfig.borrower1Amount,
      60 * 60 * 24 * 365,
      12,
      BigNumber.from(1).mul(BigNumber.from(10).pow(18)).div(120),
      0,
      "I want money!",
      'test'
    );
    const loanRequest1 = await bnc.bankNodeMakerA.BNPLBankNode.loanRequests(0);
    expect(loanRequest1.borrower).equals(bnc.borrowerA1.address, "should be borrower 1");
    await bnc.bankNodeMakerA.BNPLBankNode.approveLoanRequest(0);
    expect(bnc.borrowerA1.DAI.balanceOf(bnc.borrowerA1.DAI.address))
      .eventually.equals(loanConfig.borrower1Amount, "borrower 1 amount funded");


    await bnc.borrowerA2.BNPLBankNode.requestLoan(
      loanConfig.borrower2Amount,
      60 * 60 * 24 * 30,
      3,
      BigNumber.from(1).mul(BigNumber.from(10).pow(18)).div(120),
      0,
      "I want money!",
      'test'
    );
    const loanRequest2 = await bnc.bankNodeMakerA.BNPLBankNode.loanRequests(1);
    expect(loanRequest2.borrower).equals(bnc.borrowerA2.address, "should be borrower 2");
    await bnc.bankNodeMakerA.BNPLBankNode.approveLoanRequest(1);

    expect(bnc.borrowerA2.DAI.balanceOf(bnc.borrowerA2.DAI.address))
      .eventually.equals(loanConfig.borrower2Amount, "borrower 2 amount funded");

    const poolAmt = BigNumber.from(10).pow(18).mul(10000);
    await bnc.bnplTokenDeployer.BNPLToken.transfer(
      bnc.protocolAdmin.address,
      poolAmt
    );
    await bnc.protocolAdmin.BankNodeLendingRewards.setRewardsDuration(
      1,
      60 * 60 * 24 * 7,
    );
    await bnc.protocolAdmin.BNPLToken.approve(
      bnc.protocolAdmin.BankNodeLendingRewards.address,
      poolAmt
    );
    const results = await bnc.protocolAdmin.BankNodeLendingRewards.getBNPLTokenDistribution(poolAmt);
    await bnc.protocolAdmin.BankNodeLendingRewards.distributeBNPLTokensToBankNodes(poolAmt);
    await expect(bnc.lenderA1.BNPLToken.balanceOf(bnc.lenderA1.address)).eventually.equals(BigNumber.from(0));
    await hre.ethers.provider.send("evm_increaseTime", [60 * 60 * 24 * 3.5])

    await bnc.lenderA1.BankNodeLendingRewards.withdraw(1, loanConfig.lender1Amount);


    try {
      await bnc.lenderA1.BankNodeLendingRewards.getReward(1);

    } catch (err1) { console.error("ERR1: ", 2) }

    await expect(bnc.lenderA1.BNPLToken.balanceOf(bnc.lenderA1.address)).eventually.not.eq(BigNumber.from(0));


  });

  it('not enough to bond', async function () {
    const { users, BNPLToken, DAI, BankNodeManager } = await setup();

    await users.bankNodeMakerA.BNPLToken.approve(
      BankNodeManager.address,
      "100000000000000000000000"
    );


    /*
        await expect(
          users.bankNodeMakerA.BankNodeManager.createBondedBankNode(
            users.bankNodeMakerA.address,
            "10000000000000000000000",
            DAI.address,
            "My First Node!",
            "https://node1.isthebest",
          )
        ).to.be.revertedWith('Not enough tokens bonded');
        */

  });
});
