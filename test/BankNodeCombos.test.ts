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
    "bankNodeMakerA": { BNPLToken: "1000000000000000000000000" },
    "bankNodeMakerB": { BNPLToken: "500000000000000000000000" },
    "bankNodeMakerC": { BNPLToken: "100000000000000000000000" },

    "lenderA1": { DAI: "100000000000000000000000" },
    "lenderA2": { DAI: "100000000000000000000000" },

    "stakerA1": { BNPLToken: "8000000000000000000000000" },
    "stakerA2": { BNPLToken: "2000000000000000000000000" },
    "stakerA3": { BNPLToken: "1000000000000000000000000" },


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

describe('BankNodeCombos', function () {
  it('Node should behave normally', async function () {
    const { users, h } = await setup();
    const u = users;

    const startBondedBNPLAmount = ms`1000000*10^18`;
    const startStakedBNPLAmount = ms`500000*10^18`;
    const startTotalBNPL = BigNumber.from(startBondedBNPLAmount).add(startStakedBNPLAmount);
    const startLiquidityAmount = ms`100000*10^18`;
    const bankNodeIdA = await h.setupBankNode(
      u.bankNodeMakerA,
      "DAI",
      startBondedBNPLAmount,
      "Test Node A",
      "https://test-node-a.example.com"
    );

    await h.stakeBNPLToBankNode(u.stakerA1, bankNodeIdA, startStakedBNPLAmount);

    await h.stakeLendingCoinToBankNode(u.lenderA1, bankNodeIdA, startLiquidityAmount, "DAI");
    const finStatesStart = await h.getBankNodeAllFinancialStates(bankNodeIdA);

    expect(finStatesStart.bankNodeFinancialState.accountsReceivableFromLoans, "No Accounts Receivable before anyone loans have been made")
      .equals(0);

    expect(finStatesStart.bankNodeFinancialState.valueOfUnusedFundsLendingDeposits, "All of the money should have gone into aave (all in unused funds lending deposits)")
      .equals(startLiquidityAmount);

    expect(finStatesStart.bankNodeFinancialState.baseTokenBalance, "All of the money should have gone into aave (no base tokens held)")
      .equals(0);

    expect(finStatesStart.bankNodeFinancialState.nodeOperatorBalance, "No operator balance before the first loan has received a payment")
      .equals(0);

    expect(finStatesStart.bankNodeFinancialState.nodeOperatorBalance, "No operator balance before the first loan has received a payment")
      .equals(0);

    expect(finStatesStart.bankNodeFinancialState.poolTotalAssetsValue, "poolTotalAssetsValue should equal the total liquidity we injected in the pool before any loans are made")
      .equals(startLiquidityAmount);

    expect(finStatesStart.bankNodeFinancialState.poolTotalLiquidAssetsValue, "poolTotalLiquidAssetsValue should equal the total liquidity we injected in the pool before any loans are made")
      .equals(startLiquidityAmount);


    expect(finStatesStart.stakingPoolFinancialState.baseTokenBalance, "total bnpl should be staked + bonded at the start")
      .equals(startTotalBNPL);

    expect(finStatesStart.stakingPoolFinancialState.poolTokensCirculating, "poolTokensCirculating = total bnpl staked at the start")
      .equals(startStakedBNPLAmount);

    expect(finStatesStart.stakingPoolFinancialState.poolTotalAssetsValue, "poolTotalAssetsValue = total bnpl staked + bonded at the start")
      .equals(startTotalBNPL);

    expect(finStatesStart.stakingPoolFinancialState.tokensBondedAllTime, "tokensBondedAllTime = total bnpl staked at the start")
      .equals(startBondedBNPLAmount);


    const loanARequest: ILoanRequest = {
      loanAmount: ms`25000*10^18`, // 25000 USD
      totalLoanDuration: 60 * 60 * 24 * 30 * 3, // 90 days
      numberOfPayments: 3, // 4 payments
      interestRatePerPayment: ms`10^18 * 0.1 / 12`, // 10% Real APR
      messageType: 0,
      message: "I need 25k to start a small business selling ice cream cones for dogs",
    };

    const loanARequestResult = await h.requestLoanBankNode(u.borrowerA1, bankNodeIdA, loanARequest);
    const borrowerA1FinStatesStart = await h.getKeyUserBalancesForBankNode(u.borrowerA1, bankNodeIdA);

    await h.approveLoanRequestBankNode(u.bankNodeMakerA, bankNodeIdA, loanARequestResult.loanRequestId);

    const borrowerA1FinStatesAfterLoanA = await h.getKeyUserBalancesForBankNode(u.borrowerA1, bankNodeIdA);


    expect(
      BigNumber.from(borrowerA1FinStatesAfterLoanA.baseLiquidityTokenBalance)
        .sub(borrowerA1FinStatesStart.baseLiquidityTokenBalance),
      "the borrower should receive exactly what he/she asked for if the loan is approved"
    ).equals(loanARequest.loanAmount);

    const finStatesAfterLoanA = await h.getBankNodeAllFinancialStates(bankNodeIdA);

    const deltaFromStartToAfterLoanA = h.deltaBMinusA<IBankNodeFinancialState>(
      finStatesStart.bankNodeFinancialState,
      finStatesAfterLoanA.bankNodeFinancialState
    );
    expect(deltaFromStartToAfterLoanA.accountsReceivableFromLoans, "account receivable should go up by loan amount")
      .equals(loanARequest.loanAmount);
    expect(deltaFromStartToAfterLoanA.poolTotalLiquidAssetsValue, "liquid assets should go down by loan amount")
      .equals(BigNumber.from(0).sub(loanARequest.loanAmount));
    expect(deltaFromStartToAfterLoanA.loanIndex, "loan index should be 1 after the first loan")
      .equals(1);





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
export {
  setup,
}
