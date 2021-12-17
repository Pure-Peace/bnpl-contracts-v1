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
function toNiceObj(o: any) {
  /*
  const out: any = {};
  Object.keys(o).forEach(k => out[k] = (o[k] + ""));
  console.log(out);
  */

}
function printFinState(name: string, finState: any) {
  /*
  console.log("FINSTATE-start: ", name);
  toNiceObj(finState.bankNodeFinancialState);
  toNiceObj(finState.stakingPoolFinancialState);
  console.log("FINSTATEN-END: ", name);
  */


}
const setup = deployments.createFixture(async () => {
  await deployments.fixture('BNPLProtocolDeploy');
  await deployments.fixture('BNPLProtocolDeployEco');
  const { protocolAdmin, protocolDeployer } = await getNamedAccounts();
  await setupMockEnvIfNeeded(hre);

  await setupProtocol(hre);

  await addLendableTokens(hre);

  await setupTokenBalancesConfig(hre, {
    "bankNodeMakerA": { BNPLToken: "9000000000000000000000000", "DAI": "100000000000000000000000000" },
    "bankNodeMakerB": { BNPLToken: "500000000000000000000000" },
    "bankNodeMakerC": { BNPLToken: "100000000000000000000000" },

    "lenderA1": { DAI: "100000000000000000000000" },
    "lenderA2": { DAI: "100000000000000000000000" },

    "borrowerA1": { DAI: "5000000000000000000000" },
    "borrowerA2": { DAI: "5000000000000000000000" },

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
  it('3 month loan for 25000 at 10% APR (Paid in Full)', async function () {
    const ct = await setup();

    const { users, h } = ct;
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
      "https://test-node-a.example.com",
      "https://test-node-b.example.com/configc.json",
      "0x38a449a43d7af4acbb4446e2984009bae0646b6b",
      "0"
    );
    const makerASC = await h.getSubContractsForBankNodeWithSigner(bankNodeIdA, u.bankNodeMakerA)
    const makerFinStatesStart = await h.getKeyUserBalancesForBankNode(u.bankNodeMakerA, bankNodeIdA);
    await h.stakeBNPLToBankNode(u.stakerA1, bankNodeIdA, startStakedBNPLAmount);

    await h.stakeLendingCoinToBankNode(u.lenderA1, bankNodeIdA, startLiquidityAmount, "DAI");
    const finStatesStart = await h.getBankNodeAllFinancialStates(bankNodeIdA);
    //console.log(finStatesStart);

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
      numberOfPayments: 3, // 3 payments
      interestRatePerPayment: ms`10^18 * 0.1 / 12`, // 10% Real APR
      messageType: 0,
      message: "I need 25k to start a small business selling ice cream cones for dogs",
    };

    const loanARequestResult = await h.requestLoanBankNode(u.borrowerA1, bankNodeIdA, loanARequest);
    const borrowerA1FinStatesStart = await h.getKeyUserBalancesForBankNode(u.borrowerA1, bankNodeIdA);

    const loanAApprovedResult = await h.approveLoanRequestBankNode(u.bankNodeMakerA, bankNodeIdA, loanARequestResult.loanRequestId);
    const loanAId = loanAApprovedResult.loanRequest.loanId;
    const loanAStart = loanAApprovedResult.loan;


    expect(
      (loanAStart.borrower + "").toLowerCase() === u.borrowerA1.address.toLowerCase() &&
      (loanAStart.status + "") === "1" &&
      loanAStart.interestRatePerPayment.eq(loanARequest.interestRatePerPayment) &&
      loanAStart.loanAmount.eq(loanARequest.loanAmount) &&
      loanAStart.totalLoanDuration.eq(loanARequest.totalLoanDuration) &&
      loanAStart.totalAmountPaid.eq(0) &&
      (loanAStart.numberOfPayments + "") === (loanARequest.numberOfPayments + "") &&
      loanAStart.interestRatePerPayment.eq(loanARequest.interestRatePerPayment) &&
      (loanAStart.numberOfPaymentsMade + "") === "0"
      , "loan A should reflect the loan request we made");
    const borrowerA1FinStatesAfterLoanA = await h.getKeyUserBalancesForBankNode(u.borrowerA1, bankNodeIdA);


    expect(
      BigNumber.from(borrowerA1FinStatesAfterLoanA.baseLiquidityTokenBalance)
        .sub(borrowerA1FinStatesStart.baseLiquidityTokenBalance),
      "the borrower should receive exactly what he/she asked for if the loan is approved"
    ).equals(loanARequest.loanAmount);

    const finStatesAfterLoanA = await h.getBankNodeAllFinancialStates(bankNodeIdA);
    const b = finStatesAfterLoanA.b
    const tokenStateStaking0 = await h.getKeyUserBalancesForBankNode(b.StakingPool.address, bankNodeIdA);
    toNiceObj(tokenStateStaking0)
    //console.log([finStatesAfterLoanA.bankNodeFinancialState, finStatesAfterLoanA.stakingPoolFinancialState], 0, 2);


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


    await h.makeLoanPaymentBankNode(u.borrowerA1, bankNodeIdA, loanAId);
    const loanAAfterPayment1 = await b.BankNode.loans(loanAId);
    const finStatesAfterLoanAPayment1 = await h.getBankNodeAllFinancialStates(bankNodeIdA);
    expect(loanAAfterPayment1.totalAmountPaid.eq(loanAStart.amountPerPayment), "should equal one payment");
    expect(loanAAfterPayment1.status === 0, "loanAAfterPayment3.status should be 0 (loan in progress)");
    printFinState("finStatesAfterLoanAPayment1", finStatesAfterLoanAPayment1);

    const tokenStateStaking2 = await h.getKeyUserBalancesForBankNode(b.StakingPool.address, bankNodeIdA);
    toNiceObj(tokenStateStaking2)

    await h.makeLoanPaymentBankNode(u.borrowerA1, bankNodeIdA, loanAId);
    const loanAAfterPayment2 = await b.BankNode.loans(loanAId);
    const finStatesAfterLoanAPayment2 = await h.getBankNodeAllFinancialStates(bankNodeIdA);
    expect(loanAAfterPayment2.totalAmountPaid.eq(loanAStart.amountPerPayment.mul(2)), "should equal two payments");
    expect(loanAAfterPayment2.status === 0, "loanAAfterPayment3.status should be 0 (loan in progress)");
    printFinState("finStatesAfterLoanAPayment2", finStatesAfterLoanAPayment2);

    const tokenStateStaking3 = await h.getKeyUserBalancesForBankNode(b.StakingPool.address, bankNodeIdA);
    toNiceObj(tokenStateStaking3)
    await h.makeLoanPaymentBankNode(u.borrowerA1, bankNodeIdA, loanAId);
    const loanAAfterPayment3 = await b.BankNode.loans(loanAId);
    const finStatesAfterLoanAPayment3 = await h.getBankNodeAllFinancialStates(bankNodeIdA);
    expect(loanAAfterPayment3.totalAmountPaid.eq(loanAStart.amountPerPayment.mul(3)), "should equal three payments");
    expect(loanAAfterPayment3.numberOfPaymentsMade === 3, "numberOfPayment should be 3");
    expect(loanAAfterPayment3.status === 1, "loanAAfterPayment3.status should be 1 (loan completed)");
    printFinState("finStatesAfterLoanAPayment3", finStatesAfterLoanAPayment3);
    //console.log(finStatesAfterLoanAPayment3.bankNodeFinancialState.nodeOperatorBalance)
    //console.log(loanAAfterPayment3.totalAmountPaid, loanAAfterPayment3.loanAmount, loanAAfterPayment3.totalAmountPaid.sub(loanAAfterPayment3.loanAmount), loanAAfterPayment3.totalAmountPaid.sub(loanAAfterPayment3.loanAmount))

    //console.log(loanAAfterPayment3.totalAmountPaid.sub(loanAAfterPayment3.loanAmount).div(10), loanAAfterPayment3.totalAmountPaid.sub(loanAAfterPayment3.loanAmount).div(10) + "", finStatesAfterLoanAPayment3.bankNodeFinancialState.nodeOperatorBalance);
    expect(loanAAfterPayment3.totalAmountPaid.sub(loanAAfterPayment3.loanAmount).div(10).eq(finStatesAfterLoanAPayment3.bankNodeFinancialState.nodeOperatorBalance))
    const makerFinStatesBeforeOperatorRewardsA = await h.getKeyUserBalancesForBankNode(u.bankNodeMakerA, bankNodeIdA);
    const finStateABeforeOperatorRewardsA = await h.getBankNodeAllFinancialStates(bankNodeIdA);
    await h.withdrawOperatorRewardsToSelf(u.bankNodeMakerA, bankNodeIdA, finStatesAfterLoanAPayment3.bankNodeFinancialState.nodeOperatorBalance);
    const finStateAAfterOperatorRewardsA = await h.getBankNodeAllFinancialStates(bankNodeIdA);
    const makerFinStatesAfterOperatorRewardsA = await h.getKeyUserBalancesForBankNode(u.bankNodeMakerA, bankNodeIdA);
    expect(BigNumber.from(finStateABeforeOperatorRewardsA.bankNodeFinancialState.nodeOperatorBalance).eq(BigNumber.from(makerFinStatesAfterOperatorRewardsA.baseLiquidityTokenBalance).sub(makerFinStatesBeforeOperatorRewardsA.baseLiquidityTokenBalance)), "entire node operator balance should be added when we claim all liquidity token rewards")


    expect(BigNumber.from(finStateAAfterOperatorRewardsA.bankNodeFinancialState.nodeOperatorBalance).eq(0), "should be 0 operator balance after full cash out");
    expect(BigNumber.from(finStateAAfterOperatorRewardsA.stakingPoolFinancialState.nodeOwnerPoolTokenRewards).gt(0), "should not be 0 pool token rewards");
    expect(BigNumber.from(finStateAAfterOperatorRewardsA.stakingPoolFinancialState.nodeOwnerBNPLRewards).gt(0), "should not be 0 bnpl rewards");
    //console.log(finStateAAfterOperatorRewardsA.stakingPoolFinancialState.nodeOwnerPoolTokenRewards)

    await makerASC.StakingPool.claimNodeOwnerPoolTokenRewards(makerASC.address);


    const makerFinStatesAfterClaimPoolTokenRewardsA = await h.getKeyUserBalancesForBankNode(u.bankNodeMakerA, bankNodeIdA);
    const tokenStateStaking8 = await h.getKeyUserBalancesForBankNode(b.StakingPool.address, bankNodeIdA);
    toNiceObj(tokenStateStaking8)
    expect(BigNumber.from(makerFinStatesAfterClaimPoolTokenRewardsA.bnplTokenBalance).sub(makerFinStatesAfterOperatorRewardsA.bnplTokenBalance).eq(finStateAAfterOperatorRewardsA.stakingPoolFinancialState.nodeOwnerBNPLRewards), "user should have claimed entire bnpl rewards")
    const finStateAAfterClaimPoolTokenRewardsRewardsA = await h.getBankNodeAllFinancialStates(bankNodeIdA);

    expect(BigNumber.from(finStateAAfterClaimPoolTokenRewardsRewardsA.stakingPoolFinancialState.nodeOwnerBNPLRewards).eq(0), "node owner rewards should be drained");




  });

  it('3 month loan for 25000 at 10% APR (Misses final payment)', async function () {
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
      "https://test-node-a.example.com",
      "https://test-node-b.example.com/configa.json",
      "0x38a449a43d7af4acbb4446e2984009bae0646b6b",
      "0"
    );
    //console.log("default occurred!")
    /*function toNiceObj(o: any) {
      const out: any = {};
      Object.keys(o).forEach(k => out[k] = (o[k] + ""));
      console.log(out);

    }
    function printFinState(name: string, finState: any) {
      console.log("FINSTATE-start: ", name);
      toNiceObj(finState.bankNodeFinancialState);
      toNiceObj(finState.stakingPoolFinancialState);
      console.log("FINSTATEN-END: ", name);


    }*/
    await h.stakeBNPLToBankNode(u.stakerA1, bankNodeIdA, startStakedBNPLAmount);

    await h.stakeLendingCoinToBankNode(u.lenderA1, bankNodeIdA, startLiquidityAmount, "DAI");
    const finStatesStart = await h.getBankNodeAllFinancialStates(bankNodeIdA);
    //printFinState("finStatesStart", finStatesStart);

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

    const loanAApprovedResult = await h.approveLoanRequestBankNode(u.bankNodeMakerA, bankNodeIdA, loanARequestResult.loanRequestId);
    const loanAId = loanAApprovedResult.loanRequest.loanId;
    const loanAStart = loanAApprovedResult.loan;

    expect(
      (loanAStart.borrower + "").toLowerCase() === u.borrowerA1.address.toLowerCase() &&
      (loanAStart.status + "") === "1" &&
      loanAStart.interestRatePerPayment.eq(loanARequest.interestRatePerPayment) &&
      loanAStart.loanAmount.eq(loanARequest.loanAmount) &&
      loanAStart.totalLoanDuration.eq(loanARequest.totalLoanDuration) &&
      loanAStart.totalAmountPaid.eq(0) &&
      (loanAStart.numberOfPayments + "") === (loanARequest.numberOfPayments + "") &&
      loanAStart.interestRatePerPayment.eq(loanARequest.interestRatePerPayment) &&
      (loanAStart.numberOfPaymentsMade + "") === "0"
      , "loan A should reflect the loan request we made");
    const borrowerA1FinStatesAfterLoanA = await h.getKeyUserBalancesForBankNode(u.borrowerA1, bankNodeIdA);


    expect(
      BigNumber.from(borrowerA1FinStatesAfterLoanA.baseLiquidityTokenBalance)
        .sub(borrowerA1FinStatesStart.baseLiquidityTokenBalance),
      "the borrower should receive exactly what he/she asked for if the loan is approved"
    ).equals(loanARequest.loanAmount);

    const finStatesAfterLoanA = await h.getBankNodeAllFinancialStates(bankNodeIdA);
    const b = finStatesAfterLoanA.b
    //printFinState("finStatesAfterLoanA", finStatesAfterLoanA);

    const deltaFromStartToAfterLoanA = h.deltaBMinusA<IBankNodeFinancialState>(
      finStatesStart.bankNodeFinancialState,
      finStatesAfterLoanA.bankNodeFinancialState
    );
    //console.log("DELTA")
    //toNiceObj(deltaFromStartToAfterLoanA);

    expect(deltaFromStartToAfterLoanA.accountsReceivableFromLoans, "account receivable should go up by loan amount")
      .equals(loanARequest.loanAmount);
    expect(deltaFromStartToAfterLoanA.poolTotalLiquidAssetsValue, "liquid assets should go down by loan amount")
      .equals(BigNumber.from(0).sub(loanARequest.loanAmount));
    expect(deltaFromStartToAfterLoanA.loanIndex, "loan index should be 1 after the first loan")
      .equals(1);


    await h.makeLoanPaymentBankNode(u.borrowerA1, bankNodeIdA, loanAId);
    const loanAAfterPayment1 = await b.BankNode.loans(loanAId);
    const finStatesAfterLoanAPayment1 = await h.getBankNodeAllFinancialStates(bankNodeIdA);
    expect(loanAAfterPayment1.totalAmountPaid.eq(loanAStart.amountPerPayment), "should equal one payment");
    //printFinState("finStatesAfterLoanAPayment1", finStatesAfterLoanAPayment1);

    await h.makeLoanPaymentBankNode(u.borrowerA1, bankNodeIdA, loanAId);
    const loanAAfterPayment2 = await b.BankNode.loans(loanAId);
    const finStatesAfterLoanAPayment2 = await h.getBankNodeAllFinancialStates(bankNodeIdA);
    expect(loanAAfterPayment2.totalAmountPaid.eq(loanAStart.amountPerPayment.mul(2)), "should equal two payments");
    expect(loanAAfterPayment2.status === 1, "loanAAfterPayment3.status should be 3 (loan completed)");
    //printFinState("finStatesAfterLoanAPayment2", finStatesAfterLoanAPayment2);

    await h.missPaymentBankNodeAndReport(u.lenderA2, bankNodeIdA, loanAId);
    const loanAAfterPayment3Missed = await b.BankNode.loans(loanAId);
    const finStatesAfterLoanAPayment3Missed = await h.getBankNodeAllFinancialStates(bankNodeIdA);
    //printFinState("finStatesAfterLoanAPayment3Missed", finStatesAfterLoanAPayment3Missed);

    expect(loanAAfterPayment3Missed.totalAmountPaid.eq(loanAStart.amountPerPayment.mul(2)), "should equal two payment");
    expect(loanAAfterPayment3Missed.numberOfPaymentsMade === 2, "numberOfPayment should be 3");
    expect(loanAAfterPayment3Missed.status === 2, "loanAAfterPayment3.status should be 3 (loan defaulted)");


    await h.donateLendingCoinToBankNode(u.bankNodeMakerA, bankNodeIdA, ms`12000*10^18`, "DAI");
    await h.donateBNPLToBankNode(u.bankNodeMakerA, bankNodeIdA, ms`150000*10^18`);
    const finStatesAfterDonation1 = await h.getBankNodeAllFinancialStates(bankNodeIdA);
    //printFinState("finStatesAfterDonation1", finStatesAfterDonation1);






  });

  it('12 month loan for 25000 at 10% APR (Misses final payment)', async function () {
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
      "https://test-node-a.example.com",
      "https://test-node-b.example.com/configa.json",
      "0x38a449a43d7af4acbb4446e2984009bae0646b6b",
      "0"
    );

    //console.log("default occurred!")
    /**/
    await h.stakeBNPLToBankNode(u.stakerA1, bankNodeIdA, startStakedBNPLAmount);

    await h.stakeLendingCoinToBankNode(u.lenderA1, bankNodeIdA, startLiquidityAmount, "DAI");
    const finStatesStart = await h.getBankNodeAllFinancialStates(bankNodeIdA);
    //printFinState("finStatesStart", finStatesStart);

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
      totalLoanDuration: 60 * 60 * 24 * 30 * 12, // 360 days
      numberOfPayments: 3, // 4 payments
      interestRatePerPayment: ms`10^18 * 0.1 / 12`, // 10% Real APR
      messageType: 0,
      message: "I need 25k to start a small business selling ice cream cones for dogs",
    };

    const loanARequestResult = await h.requestLoanBankNode(u.borrowerA1, bankNodeIdA, loanARequest);
    const borrowerA1FinStatesStart = await h.getKeyUserBalancesForBankNode(u.borrowerA1, bankNodeIdA);

    const loanAApprovedResult = await h.approveLoanRequestBankNode(u.bankNodeMakerA, bankNodeIdA, loanARequestResult.loanRequestId);
    const loanAId = loanAApprovedResult.loanRequest.loanId;
    const loanAStart = loanAApprovedResult.loan;

    expect(
      (loanAStart.borrower + "").toLowerCase() === u.borrowerA1.address.toLowerCase() &&
      (loanAStart.status + "") === "1" &&
      loanAStart.interestRatePerPayment.eq(loanARequest.interestRatePerPayment) &&
      loanAStart.loanAmount.eq(loanARequest.loanAmount) &&
      loanAStart.totalLoanDuration.eq(loanARequest.totalLoanDuration) &&
      loanAStart.totalAmountPaid.eq(0) &&
      (loanAStart.numberOfPayments + "") === (loanARequest.numberOfPayments + "") &&
      loanAStart.interestRatePerPayment.eq(loanARequest.interestRatePerPayment) &&
      (loanAStart.numberOfPaymentsMade + "") === "0"
      , "loan A should reflect the loan request we made");
    const borrowerA1FinStatesAfterLoanA = await h.getKeyUserBalancesForBankNode(u.borrowerA1, bankNodeIdA);


    expect(
      BigNumber.from(borrowerA1FinStatesAfterLoanA.baseLiquidityTokenBalance)
        .sub(borrowerA1FinStatesStart.baseLiquidityTokenBalance),
      "the borrower should receive exactly what he/she asked for if the loan is approved"
    ).equals(loanARequest.loanAmount);

    const finStatesAfterLoanA = await h.getBankNodeAllFinancialStates(bankNodeIdA);
    const b = finStatesAfterLoanA.b
    printFinState("finStatesAfterLoanA", finStatesAfterLoanA);

    const deltaFromStartToAfterLoanA = h.deltaBMinusA<IBankNodeFinancialState>(
      finStatesStart.bankNodeFinancialState,
      finStatesAfterLoanA.bankNodeFinancialState
    );
    //console.log("DELTA")
    //toNiceObj(deltaFromStartToAfterLoanA);

    expect(deltaFromStartToAfterLoanA.accountsReceivableFromLoans, "account receivable should go up by loan amount")
      .equals(loanARequest.loanAmount);
    expect(deltaFromStartToAfterLoanA.poolTotalLiquidAssetsValue, "liquid assets should go down by loan amount")
      .equals(BigNumber.from(0).sub(loanARequest.loanAmount));
    expect(deltaFromStartToAfterLoanA.loanIndex, "loan index should be 1 after the first loan")
      .equals(1);


    await h.makeLoanPaymentBankNode(u.borrowerA1, bankNodeIdA, loanAId);
    const loanAAfterPayment1 = await b.BankNode.loans(loanAId);
    const finStatesAfterLoanAPayment1 = await h.getBankNodeAllFinancialStates(bankNodeIdA);
    expect(loanAAfterPayment1.totalAmountPaid.eq(loanAStart.amountPerPayment), "should equal one payment");
    printFinState("finStatesAfterLoanAPayment1", finStatesAfterLoanAPayment1);

    await h.makeLoanPaymentBankNode(u.borrowerA1, bankNodeIdA, loanAId);
    const loanAAfterPayment2 = await b.BankNode.loans(loanAId);
    const finStatesAfterLoanAPayment2 = await h.getBankNodeAllFinancialStates(bankNodeIdA);
    expect(loanAAfterPayment2.totalAmountPaid.eq(loanAStart.amountPerPayment.mul(2)), "should equal two payments");
    expect(loanAAfterPayment2.status === 1, "loanAAfterPayment3.status should be 3 (loan completed)");
    printFinState("finStatesAfterLoanAPayment2", finStatesAfterLoanAPayment2);

    await h.missPaymentBankNodeAndReport(u.lenderA2, bankNodeIdA, loanAId);
    const loanAAfterPayment3Missed = await b.BankNode.loans(loanAId);
    const finStatesAfterLoanAPayment3Missed = await h.getBankNodeAllFinancialStates(bankNodeIdA);
    printFinState("finStatesAfterLoanAPayment3Missed", finStatesAfterLoanAPayment3Missed);

    expect(loanAAfterPayment3Missed.totalAmountPaid.eq(loanAStart.amountPerPayment.mul(2)), "should equal two payment");
    expect(loanAAfterPayment3Missed.numberOfPaymentsMade === 2, "numberOfPayment should be 3");
    expect(loanAAfterPayment3Missed.status === 2, "loanAAfterPayment3.status should be 3 (loan defaulted)");


    await h.donateLendingCoinToBankNode(u.bankNodeMakerA, bankNodeIdA, ms`12000*10^18`, "DAI");
    await h.donateBNPLToBankNode(u.bankNodeMakerA, bankNodeIdA, ms`150000*10^18`);
    const finStatesAfterDonation1 = await h.getBankNodeAllFinancialStates(bankNodeIdA);
    //printFinState("finStatesAfterDonation1", finStatesAfterDonation1);






  });


  it('Test BankNode unbond', async function () {
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
      "https://test-node-a.example.com",
      "https://test-node-b.example.com/configa.json",
      "0x38a449a43d7af4acbb4446e2984009bae0646b6b",
      "0"
    );

    //console.log("default occurred!")
    /**/
    await h.stakeBNPLToBankNode(u.stakerA1, bankNodeIdA, startStakedBNPLAmount);

    await h.stakeLendingCoinToBankNode(u.lenderA1, bankNodeIdA, startLiquidityAmount, "DAI");
    const finStatesStart = await h.getBankNodeAllFinancialStates(bankNodeIdA);
    //printFinState("finStatesStart", finStatesStart);

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

    const finStatesAfterLoanA = await h.getBankNodeAllFinancialStates(bankNodeIdA);
    const b = finStatesAfterLoanA.b
    await b.StakingPool.unbondTokens(await b.StakingPool.getPoolWithdrawConversion(await b.StakingPool.virtualPoolTokensCount()))


    let result
    try {
      const loanARequest: ILoanRequest = {
        loanAmount: ms`25000*10^18`, // 25000 USD
        totalLoanDuration: 60 * 60 * 24 * 30 * 12, // 360 days
        numberOfPayments: 3, // 4 payments
        interestRatePerPayment: ms`10^18 * 0.1 / 12`, // 10% Real APR
        messageType: 0,
        message: "I need 25k to start a small business selling ice cream cones for dogs",
      };

      const loanARequestResult = await h.requestLoanBankNode(u.borrowerA1, bankNodeIdA, loanARequest);
      const borrowerA1FinStatesStart = await h.getKeyUserBalancesForBankNode(u.borrowerA1, bankNodeIdA);

      const loanAApprovedResult = await h.approveLoanRequestBankNode(u.bankNodeMakerA, bankNodeIdA, loanARequestResult.loanRequestId);
      const loanAId = loanAApprovedResult.loanRequest.loanId;
      const loanAStart = loanAApprovedResult.loan;
      result = false
    } catch (_err) {
      result = true
    }

    expect(result, "After unbond: BankNode bonded amount is less than 75% of the minimum bonded")
      .equals(false);
  });
});
export {
  setup,
}
