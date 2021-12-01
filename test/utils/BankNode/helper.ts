import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import { ethers as eTypes } from "ethers";
import { getNamedAccounts, ethers } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { setupUsersWithNames, setupUser } from "..";
import { BNPLToken, BNPLProtocolConfig, BankNodeManager, BankNodeLendingRewards, IAaveLendingPool, IERC20, ERC20, BNPLBankNode, BNPLStakingPool, PoolTokenUpgradeable } from "../../../typechain";
import { ms } from "../../../utils/math";
import { genGetContractWith } from "../genHelpers";
import { getContractForEnvironment } from "../getContractForEnvironment";
interface ILoanRequest {
  loanAmount: BigNumberish;
  totalLoanDuration: BigNumberish;
  numberOfPayments: BigNumberish;
  interestRatePerPayment: BigNumberish;
  messageType: BigNumberish;
  message: string;
}

interface IKeyNodeBalancesForUser {
  baseLiquidityTokenBalance: BigNumberish;
  poolLiquidityTokenBalance: BigNumberish;
  stakingPoolTokenBalance: BigNumberish;
  bnplTokenBalance: BigNumber;
}
interface IBankNodeFinancialState {
  baseTokenBalance: BigNumberish;
  nodeOperatorBalance: BigNumberish;
  accountsReceivableFromLoans: BigNumberish;
  poolTokensCirculating: BigNumberish;
  loanRequestIndex: BigNumberish;
  loanIndex: BigNumberish;
  valueOfUnusedFundsLendingDeposits: BigNumberish;
  poolTotalAssetsValue: BigNumberish;
  poolTotalLiquidAssetsValue: BigNumberish;
  poolDepositConversion: BigNumberish;
  poolWithdrawConversion: BigNumberish;
}
interface IBankNodeStakingPoolFinancialState {
  totalTokensLocked: BigNumberish;
  unstakeLockupPeriod: BigNumberish;
  baseTokenBalance: BigNumberish;
  tokensBondedAllTime: BigNumberish;
  poolTokensCirculating: BigNumberish;
  poolTotalAssetsValue: BigNumberish;
  poolDepositConversion: BigNumberish;
  poolWithdrawConversion: BigNumberish;
}
type TDeltaBASupported = ILoanRequest | IKeyNodeBalancesForUser | IBankNodeFinancialState | IBankNodeStakingPoolFinancialState;// | { [key: string]: BigNumberish };

async function BankNodeHelper(hre: HardhatRuntimeEnvironment) {

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
  async function getSignerForMaybe(x?: string | eTypes.Signer | { address: string }) {
    if (typeof x === 'undefined' || x === null) {
      return null;
    } else if (typeof x === 'string') {
      return ethers.getSigner(x);
    } else {
      return x;
    }

  }
  const namedAccounts = await getNamedAccounts();
  const u = await setupUsersWithNames(namedAccounts as any, contracts);
  const { getContract, getContractAt } = await genGetContractWith(hre);
  type TUserWithContractDefs = typeof u[keyof typeof u];
  const otherUserCache: { [address: string]: TUserWithContractDefs } = {};
  async function estBlockTimestamp(): Promise<number> {
    const n = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(n);
    return block.timestamp;
  }
  async function setBlockTime(n: number | string) {
    await hre.ethers.provider.send("evm_setNextBlockTimestamp", [n]);
    await hre.ethers.provider.send("evm_mine", []);

  }
  async function incBlockTime(n: number | string) {
    await hre.ethers.provider.send("evm_increaseTime", [n]);
    await hre.ethers.provider.send("evm_mine", []);

  }
  async function getUserWithAddress(address: string) {
    if (address in otherUserCache) {
      return otherUserCache[address];
    }
    if (address in u) {
      return u[address as keyof typeof u];
    }
    const tUser = Object.keys(u).map(k => u[k as keyof typeof u]).filter(x => (x.address.toLowerCase() === address.toLowerCase()))[0];
    if (tUser) {
      return tUser;
    } else {
      const nUser = await setupUser(address, contracts);
      otherUserCache[address] = nUser;
      return nUser;
    }
  }



  async function getBankNodeAddressFromString(str: string | number | eTypes.Contract | { address: string }): Promise<string> {
    if (typeof str === 'number' || (typeof str === 'string' && str.length < 4)) {
      const bankNodeContractAddress = (await contracts.BankNodeManager.bankNodes(str)).bankNodeContract + "";
      if (bankNodeContractAddress.replace(/[0|x|X]/g, "").length === 0) {
        throw new Error("Invalid bank node id :" + str);
      }
      return bankNodeContractAddress;
    } else if (typeof str === 'string') {
      if (str.substring(0, 2) === "0x") {
        return str;
      } else {
        throw new Error("Invalid bank node address: " + str);
      }
    } else if (str.address) {
      return str.address;
    }
    throw new Error("Invalid bank node contract string: " + str);
  }
  async function getBankNodeContractFromString(str: string | number | eTypes.Contract | { address: string }, signer?: string | eTypes.Signer): Promise<BNPLBankNode> {
    const strResult = await getBankNodeAddressFromString(str);
    return getContractAt<BNPLBankNode>("BNPLBankNode", strResult, signer);
  }
  async function getSubContractsForBankNode(bankNodeIdOrContract: string | number | eTypes.Contract | { address: string }) {
    const BankNode = await getBankNodeContractFromString(bankNodeIdOrContract);
    const StakingPool = await getContractAt<BNPLStakingPool>(
      "BNPLStakingPool",
      await BankNode.nodeStakingPool(),
    );
    const BaseLiquidityToken = await getContractAt<ERC20>(
      "ERC20",
      await BankNode.baseLiquidityToken()
    );
    const PoolLiquidityToken = await getContractAt<PoolTokenUpgradeable>(
      "PoolTokenUpgradeable",
      await BankNode.poolLiquidityToken()
    );
    const StakingPoolToken = await getContractAt<PoolTokenUpgradeable>(
      "PoolTokenUpgradeable",
      await StakingPool.POOL_LIQUIDITY_TOKEN()
    );
    const contractsObject = {
      BankNode,
      StakingPool,
      BaseLiquidityToken,
      PoolLiquidityToken,
      StakingPoolToken,
      BNPLToken: contracts.BNPLToken,
      BankNodeLendingRewards: contracts.BankNodeLendingRewards,
    };
    return contractsObject;
  }
  async function getSubContractsForBankNodeWithSigner(bankNodeIdOrContract: string | number | eTypes.Contract | { address: string }, signer?: string | eTypes.Signer | { address: string }) {
    const contractsObject = await getSubContractsForBankNode(bankNodeIdOrContract);
    if (!signer) {
      return { ...contractsObject, address: "" };
    } else {
      return setupUser(signer, contractsObject);
    }
  }
  async function getSubContractsForBankNodeWithSigners(bankNodeIdOrContract: string | number | eTypes.Contract | { address: string }, signers: (string | eTypes.Signer | { address: string })[] = []) {
    const contractsObject = await getSubContractsForBankNode(bankNodeIdOrContract);
    const outArr: (typeof contractsObject & { address: string })[] = [];

    for (const key of signers) {
      outArr.push(await setupUser(key, contractsObject));

    }
    return outArr;
  }
  async function getAddress(key: string) {
    if (key.substring(0, 2) === "0x") {
      return key;
    }
    if (key in contracts) {
      return contracts[key as keyof typeof contracts].address;
    }
    return (await getUserWithAddress(key)).address;
  }
  async function getFinancialStateForBankNode(bankNode: BNPLBankNode) {
    const financialState: IBankNodeFinancialState = {

      baseTokenBalance: await bankNode.baseTokenBalance(),
      nodeOperatorBalance: await bankNode.nodeOperatorBalance(),
      accountsReceivableFromLoans: await bankNode.accountsReceivableFromLoans(),
      poolTokensCirculating: await bankNode.poolTokensCirculating(),
      loanRequestIndex: await bankNode.loanRequestIndex(),
      loanIndex: await bankNode.loanIndex(),
      valueOfUnusedFundsLendingDeposits: await bankNode.getValueOfUnusedFundsLendingDeposits(),
      poolTotalAssetsValue: await bankNode.getPoolTotalAssetsValue(),
      poolTotalLiquidAssetsValue: await bankNode.getPoolTotalLiquidAssetsValue(),
      poolDepositConversion: await bankNode.getPoolDepositConversion(ms`10^18`),
      poolWithdrawConversion: await bankNode.getPoolWithdrawConversion(ms`10^18`),
    };
    return financialState;
  }
  async function getFinancialStateForBankNodeStakingPool(stakingPool: BNPLStakingPool) {
    const financialState: IBankNodeStakingPoolFinancialState = {
      totalTokensLocked: await stakingPool.totalTokensLocked(),
      unstakeLockupPeriod: await stakingPool.getUnstakeLockupPeriod(),
      baseTokenBalance: await stakingPool.baseTokenBalance(),
      poolTokensCirculating: await stakingPool.poolTokensCirculating(),
      poolTotalAssetsValue: await stakingPool.getPoolTotalAssetsValue(),
      poolDepositConversion: await stakingPool.getPoolDepositConversion(ms`10^18`),
      poolWithdrawConversion: await stakingPool.getPoolWithdrawConversion(ms`10^18`),
      tokensBondedAllTime: await stakingPool.tokensBondedAllTime(),
    };
    return financialState;
  }

  async function getKeyUserBalancesForBankNode(_user: string | { address: string }, bankNode: string | { address: string }): Promise<IKeyNodeBalancesForUser> {
    const user = typeof _user === 'string' ? await getUserWithAddress(_user) : _user;
    const b = await getSubContractsForBankNodeWithSigner(bankNode);

    return {
      baseLiquidityTokenBalance: await b.BaseLiquidityToken.balanceOf(user.address),
      poolLiquidityTokenBalance: await b.PoolLiquidityToken.balanceOf(user.address),
      stakingPoolTokenBalance: await b.StakingPoolToken.balanceOf(user.address),
      bnplTokenBalance: await b.BNPLToken.balanceOf(user.address),
    }
  }

  function deltaBMinusA<T extends TDeltaBASupported>(a: T, b: T): T {
    const c: any = {};
    for (const t in a) {
      c[t] = BigNumber.from(b[t]).sub(BigNumber.from(a[t]));
    }
    return c as T;
  }
  async function getBankNodeAllFinancialStates(bankNodeId: string) {
    const b = await getSubContractsForBankNodeWithSigner(bankNodeId);
    return {
      b,
      bankNodeFinancialState: await getFinancialStateForBankNode(b.BankNode),
      stakingPoolFinancialState: await getFinancialStateForBankNodeStakingPool(b.StakingPool),
    }

  }
  async function sendToken(_to: string | { address: string }, tokenName: "BNPLToken" | "DAI" | "USDT" | "USDC" | string, amount: string | number | BigNumberish, _from?: string | { address: string }) {
    const to = typeof _to === 'string' ? (await getAddress(_to)) : _to.address;
    const from = _from ? (typeof _from === 'string' ? (await getAddress(_from)) : _from.address) : null;

    if (tokenName === "BNPLToken") {
      await u.bnplTokenDeployer.BNPLToken.transfer(to, amount);
      return contracts[tokenName];
    } else if (tokenName in contracts) {
      await (u.mockContractsDeployer[tokenName as keyof typeof contracts] as ERC20).transfer(to, amount);
      return (u.mockContractsDeployer[tokenName as keyof typeof contracts] as ERC20);

    } else {
      if (!from) {
        throw new Error("missing from!");
      }
      const contract = (await getContractAt<ERC20>("ERC20", tokenName, await hre.ethers.getSigner(from)));

      await contract.transfer(to, amount);
      return { contract, newBalanceOfActor: await contract.balanceOf(to) };
    }

  }
  async function approveToken(_from: string | { address: string }, _to: string | { address: string }, tokenName: "BNPLToken" | "DAI" | "USDT" | "USDC" | string, amount: string | number | BigNumberish) {
    const to = typeof _to === 'string' ? (await getAddress(_to)) : _to.address;
    const from = typeof _from === 'string' ? (await getAddress(_from)) : _from.address;
    const tokenContractAddress = await getAddress(tokenName);
    const contract = (await getContractAt<ERC20>("ERC20", tokenContractAddress, await hre.ethers.getSigner(from)));
    await contract.approve(to, amount);
    return { contract, };

  }
  async function donateLendingCoinToBankNode(_from: string | { address: string }, _bankNode: string | { address: string }, amount: string, tokenName: "DAI" | "USDT" | "USDC") {

    const bankNodeAddress = await getBankNodeAddressFromString(_bankNode);
    const from = typeof _from === 'string' ? (await getAddress(_from)) : _from.address;

    const contract = await getContractAt<BNPLBankNode>("BNPLBankNode", bankNodeAddress, await hre.ethers.getSigner(from));
    await approveToken(from, contract, tokenName, amount);
    await contract.donate(amount);

    return { contract, };
  }
  async function stakeLendingCoinToBankNode(_from: string | { address: string }, _bankNode: string | { address: string }, amount: string, tokenName: "DAI" | "USDT" | "USDC") {

    const bankNodeAddress = await getBankNodeAddressFromString(_bankNode);
    const from = typeof _from === 'string' ? (await getAddress(_from)) : _from.address;

    const contract = await getContractAt<BNPLBankNode>("BNPLBankNode", bankNodeAddress, await hre.ethers.getSigner(from));
    await approveToken(from, contract, tokenName, amount);
    await contract.addLiquidity(amount);

    return { contract, };
  }
  async function unstakeLendingCoinFromBankNode(_from: string | { address: string }, _bankNode: string | { address: string }, amount: string) {
    const bankNodeAddress = await getBankNodeAddressFromString(_bankNode);
    const from = typeof _from === 'string' ? (await getAddress(_from)) : _from.address;

    const contract = await getContractAt<BNPLBankNode>("BNPLBankNode", bankNodeAddress, await hre.ethers.getSigner(from));
    //await approveToken(from, contract, tokenName, amount);
    await contract.removeLiquidity(amount);

    return { contract, };
  }

  async function bondTokensToBankNode(_from: string | { address: string }, _bankNode: string | { address: string }, amount: string) {
    //const bankNodeAddress = typeof _bankNode === 'string' ? (await getAddress(_bankNode)) : _bankNode.address;
    //const from = typeof _from === 'string' ? (await getAddress(_from)) : _from.address;
    const b = await getSubContractsForBankNodeWithSigner(_bankNode, _from);
    await b.BNPLToken.approve(b.StakingPool.address, amount);
    await b.StakingPool.bondTokens(amount);

    return { b, };
  }

  async function donateBNPLToBankNode(_from: string | { address: string }, _bankNode: string | { address: string }, amount: string) {
    //const bankNodeAddress = typeof _bankNode === 'string' ? (await getAddress(_bankNode)) : _bankNode.address;
    //const from = typeof _from === 'string' ? (await getAddress(_from)) : _from.address;
    const b = await getSubContractsForBankNodeWithSigner(_bankNode, _from);
    await b.BNPLToken.approve(b.StakingPool.address, amount);
    await b.StakingPool.donate(amount);

    return { b, };
  }
  async function stakeBNPLToBankNode(_from: string | { address: string }, _bankNode: string | { address: string }, amount: string) {
    //const bankNodeAddress = typeof _bankNode === 'string' ? (await getAddress(_bankNode)) : _bankNode.address;
    //const from = typeof _from === 'string' ? (await getAddress(_from)) : _from.address;
    const b = await getSubContractsForBankNodeWithSigner(_bankNode, _from);
    await b.BNPLToken.approve(b.StakingPool.address, amount);
    await b.StakingPool.stakeTokens(amount);

    return { b, };
  }
  async function unstakeBNPLFromBankNode(_from: string | { address: string }, _bankNode: string | { address: string }, amount: string) {
    //const from = typeof _from === 'string' ? (await getAddress(_from)) : _from.address;
    const b = await getSubContractsForBankNodeWithSigner(_bankNode, _from);
    await b.StakingPool.unstakeTokens(amount);
    return { b, };
  }
  async function setupBankNode(_user: string | TUserWithContractDefs, tokenType: "DAI" | "USDT" | "USDC", tokensToBond: string, nodeName: string, website: string) {
    const user = typeof _user === 'string' ? await getUserWithAddress(_user) : _user;

    await approveToken(user, user.BankNodeManager.address, "BNPLToken", tokensToBond);

    const result = await user.BankNodeManager.callStatic.createBondedBankNode(
      user.address,
      tokensToBond,
      contracts[tokenType].address,
      nodeName,
      website
    );

    const bankNodeId = result + "";
    await user.BankNodeManager.createBondedBankNode(
      user.address,
      tokensToBond,
      contracts[tokenType].address,
      nodeName,
      website
    );
    const newCount = await user.BankNodeManager.bankNodeCount();

    if ((newCount + "") !== bankNodeId) {
      throw new Error("Unable to predict bank node id!");
    }

    return bankNodeId;
  }



  async function requestLoanBankNode(_user: string | TUserWithContractDefs, bankNode: string | { address: string }, loanRequest: ILoanRequest) {
    const user = typeof _user === 'string' ? await getUserWithAddress(_user) : _user;
    const b = await getSubContractsForBankNodeWithSigner(bankNode, user);
    const curLoanRequestIndex = parseFloat((await b.BankNode.loanRequestIndex()).toString());


    const result = await b.BankNode.requestLoan(
      loanRequest.loanAmount,
      loanRequest.totalLoanDuration,
      loanRequest.numberOfPayments,
      loanRequest.interestRatePerPayment,
      loanRequest.messageType,
      loanRequest.message
    )
    const newLoanRequestIndex = parseFloat((await b.BankNode.loanRequestIndex()).toString());

    if (newLoanRequestIndex - curLoanRequestIndex !== 1) {
      throw new Error("Unable to predict loan request index: " + curLoanRequestIndex + " -> " + newLoanRequestIndex);
    }

    const outLoanRequest = await b.BankNode.loanRequests(curLoanRequestIndex);


    return { loanRequestId: curLoanRequestIndex.toString(), loanRequest: outLoanRequest };
  }
  async function approveLoanRequestBankNode(_user: string | TUserWithContractDefs, bankNode: string | { address: string }, loanRequestId: BigNumberish) {
    const user = typeof _user === 'string' ? await getUserWithAddress(_user) : _user;
    const b = await getSubContractsForBankNodeWithSigner(bankNode, user);
    await b.BankNode.approveLoanRequest(loanRequestId);
    const outLoanRequest = await b.BankNode.loanRequests(loanRequestId);


    const loan = await b.BankNode.loans(outLoanRequest.loanId);
    return {
      loan,
      loanRequest: outLoanRequest,
    };
  }
  async function denyLoanRequestBankNode(_user: string | TUserWithContractDefs, bankNode: string | { address: string }, loanRequestId: BigNumberish) {

    const user = typeof _user === 'string' ? await getUserWithAddress(_user) : _user;
    const b = await getSubContractsForBankNodeWithSigner(bankNode, user);
    await b.BankNode.denyLoanRequest(loanRequestId);
    const outLoanRequest = await b.BankNode.loanRequests(loanRequestId);
    return { loanRequest: outLoanRequest };
  }
  async function withdrawOperatorRewardsToSelf(_user: string | TUserWithContractDefs, bankNode: string | { address: string }, amount: BigNumberish) {



    const user = typeof _user === 'string' ? await getUserWithAddress(_user) : _user;
    const b = await getSubContractsForBankNodeWithSigner(bankNode, user);
    return b.BankNode.withdrawNodeOperatorBalance(amount, user.address);

  }
  async function makeLoanPaymentBankNode(_user: string | TUserWithContractDefs, bankNode: string | { address: string }, loanId: BigNumberish) {
    const user = typeof _user === 'string' ? await getUserWithAddress(_user) : _user;


    const b = await getSubContractsForBankNodeWithSigner(bankNode, user);
    const loanBefore = await b.BankNode.loans(loanId);
    const userLTBalanceBefore = b.BaseLiquidityToken.balanceOf(user.address);

    await b.BaseLiquidityToken.approve(b.BankNode.address, loanBefore.amountPerPayment);
    await b.BankNode.makeLoanPayment(loanId);
    const userLTBalanceAfter = b.BaseLiquidityToken.balanceOf(user.address);

    const loan = await b.BankNode.loans(loanId);
    return { loan, userLTBalanceBefore, userLTBalanceAfter };
  }
  async function getNextBankLoanPaymentDate(bankNode: string | { address: string }, loanId: BigNumberish) {
    const b = await getSubContractsForBankNodeWithSigner(bankNode);
    const nextDueDate = await b.BankNode.getLoanNextDueDate(loanId);
    if (nextDueDate.toString() === "0") {
      throw new Error("Invalid Bank Node or Loan ID!");
    }
    return nextDueDate;
  }


  async function advanceToNextPaymentDatePlusOffset(bankNode: string | { address: string }, loanId: BigNumberish, offset: BigNumberish, _user?: string | TUserWithContractDefs) {
    const b = await getSubContractsForBankNodeWithSigner(bankNode, _user);
    const nextDueDate = await b.BankNode.getLoanNextDueDate(loanId);
    if (nextDueDate.toString() === "0") {
      throw new Error("Invalid Bank Node or Loan ID!");
    }
    const newTime = nextDueDate.add(offset);
    await setBlockTime(newTime.toNumber());
    return {
      newTime,
      dueDate: nextDueDate,
      b,
    };
  }
  async function getPoolAssetReportForBankNode(bankNode: BNPLBankNode, stakingPool: BNPLStakingPool) {
    return {
      bankNodeFinancialState: await getFinancialStateForBankNode(bankNode),
      stakingPoolFinancialState: await getFinancialStateForBankNodeStakingPool(stakingPool),
    }
  }
  async function missPaymentBankNodeAndReport(_reporter: string | TUserWithContractDefs, bankNode: string | { address: string }, loanId: BigNumberish) {
    const b = await getSubContractsForBankNodeWithSigner(bankNode);
    const loanBefore = await b.BankNode.loans(loanId);
    const financialStateBefore = await getPoolAssetReportForBankNode(b.BankNode, b.StakingPool);



    const { newTime, dueDate } = await advanceToNextPaymentDatePlusOffset(bankNode, loanId, 1000 * 60 * 5, _reporter);

    await b.BankNode.reportOverdueLoan(loanId);
    const financialStateAfter = await getPoolAssetReportForBankNode(b.BankNode, b.StakingPool);

    const loanAfter = await b.BankNode.loans(loanId);
    return {
      newTime,
      dueDate,
      before: { loan: loanBefore, financialState: financialStateBefore },
      after: { loan: loanAfter, financialState: financialStateAfter },
      b,
    }

  }
  async function stakeAllBankNodePoolTokensToRewards(_user: string | TUserWithContractDefs, bankNode: string | { address: string }, amount: BigNumberish) {
    const user = typeof _user === 'string' ? await getUserWithAddress(_user) : _user;
    const b = await getSubContractsForBankNodeWithSigner(bankNode, user);
    const currentBalance = await b.PoolLiquidityToken.balanceOf(user.address);

    await b.PoolLiquidityToken.approve(b.BankNodeLendingRewards.address, currentBalance);
    await b.BankNodeLendingRewards.stake(await b.BankNode.bankNodeId(), currentBalance);

    return {
      b,
      tokensStaked: currentBalance,
    };
  }
  async function stakeBankNodePoolTokensToRewards(_user: string | TUserWithContractDefs, bankNode: string | { address: string }, amount: BigNumberish) {
    const user = typeof _user === 'string' ? await getUserWithAddress(_user) : _user;
    const b = await getSubContractsForBankNodeWithSigner(bankNode, user);
    await b.PoolLiquidityToken.approve(b.BankNodeLendingRewards.address, amount);
    await b.BankNodeLendingRewards.stake(await b.BankNode.bankNodeId(), amount);
  }
  async function unstakeBankNodePoolTokensFromRewards(_user: string | TUserWithContractDefs, bankNode: string | { address: string }, amount: BigNumberish) {
    const user = typeof _user === 'string' ? await getUserWithAddress(_user) : _user;
    const b = await getSubContractsForBankNodeWithSigner(bankNode, user);
    await b.BankNodeLendingRewards.stake(await b.BankNode.bankNodeId(), amount);
  }
  async function unstakeAllBankNodePoolTokensFromRewards(_user: string | TUserWithContractDefs, bankNode: string | { address: string }) {
    const user = typeof _user === 'string' ? await getUserWithAddress(_user) : _user;
    const b = await getSubContractsForBankNodeWithSigner(bankNode, user);
    const bankNodeId = await b.BankNode.bankNodeId();
    await b.BankNodeLendingRewards.exit(bankNodeId);
  }


  return {
    getSignerForMaybe,
    setBlockTime,
    incBlockTime,
    getUserWithAddress,
    getBankNodeAddressFromString,
    getSubContractsForBankNode,
    getSubContractsForBankNodeWithSigner,
    getSubContractsForBankNodeWithSigners,
    getFinancialStateForBankNode,
    getFinancialStateForBankNodeStakingPool,
    getKeyUserBalancesForBankNode,
    deltaBMinusA,
    getBankNodeAllFinancialStates,

    bondTokensToBankNode,
    sendToken,
    approveToken,
    donateBNPLToBankNode,
    donateLendingCoinToBankNode,
    stakeLendingCoinToBankNode,
    unstakeLendingCoinFromBankNode,
    stakeBNPLToBankNode,
    unstakeBNPLFromBankNode,
    setupBankNode,
    requestLoanBankNode,
    approveLoanRequestBankNode,
    denyLoanRequestBankNode,
    makeLoanPaymentBankNode,
    getNextBankLoanPaymentDate,
    advanceToNextPaymentDatePlusOffset,
    getPoolAssetReportForBankNode,
    missPaymentBankNodeAndReport,

    stakeAllBankNodePoolTokensToRewards,
    stakeBankNodePoolTokensToRewards,
    unstakeBankNodePoolTokensFromRewards,
    unstakeAllBankNodePoolTokensFromRewards,
    withdrawOperatorRewardsToSelf,


  }







}

export type {
  ILoanRequest,
  IKeyNodeBalancesForUser,
  IBankNodeFinancialState,
  IBankNodeStakingPoolFinancialState,
}
export {
  BankNodeHelper,
}
