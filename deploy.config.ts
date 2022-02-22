/* eslint-disable @typescript-eslint/no-unused-vars */
import { BigNumber, BigNumberish } from "ethers";

export type DeployConfig = {
  networkId: string,
  networkName: string,
  bnplTokenAddress: string,
  minBondingAmount: BigNumber,
  loanOverdueGracePeriod: number,
  defaultRewardDuration: number,
  distributorAdmin: string,
  managerAdmin: string,
  bankNodeManagerConfigurator: string,
  lendableTokens: LendableTokenConfig[]
}

export type LendableTokenConfig = {
  enabled: boolean,
  tokenContract: string,
  swapMarket: string,
  swapMarketPoolFee: BigNumber,
  decimals: number,
  valueMultiplier: BigNumber,
  unusedFundsLendingMode: number,
  unusedFundsLendingContract: string,
  unusedFundsLendingToken: string,
  unusedFundsIncentivesController: string,
  symbol: string,
  poolSymbol: string
}

const ONE_MINUTES = 60
const ONE_HOUR = ONE_MINUTES * 60
const ONE_DAYS = ONE_HOUR * 24
const ONE_WEEK = ONE_DAYS * 7;
const ONE_MONTH = ONE_DAYS * 30;
const ONE_YEAR = ONE_DAYS * 365;

// Token decimals
const USDT_TOKEN_DECIMALS = 6
const TUSD_TOKEN_DECIMALS = 18;
const BNPL_TOKEN_DECIMALS = 18

// Kovan addresses
const BNPL_TOKEN_ADDRESS_KOVAN = '0x0c6ec7437657cb501ae35718e5426815e83e9e00';
const TUSD_KOVAN = '0x016750AC630F711882812f24Dba6c95b9D35856d';
const A_TUSD_KOVAN = '0x39914AdBe5fDbC2b9ADeedE8Bcd444b20B039204';
const USDT_KOVAN = '0x13512979ADE267AB5100878E2e0f485B568328a4'
const A_USDT_KOVAN = '0xFF3c8bc103682FA918c954E84F5056aB4DD5189d'
const SUSHISWAP_KOVAN = '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506';
const AAVE_LENDING_POOL_KOVAN = '0xE0fBa4Fc209b4948668006B2bE61711b7f465bAe'
const STAKE_AAVE_KOVAN = '0xf2fbf9a6710afda1c4aab2e922de9d69e0c97fd2'
const AAVE_KOVAN = '0xB597cd8D3217ea6477232F9217fa70837ff667Af'
const AAVE_INCENTIVES_CONTROLLER_KOVAN = '0x146159b1f7Fb867fC60f16644E33378006E1Fff4'

// Mainnet addresses
const BNPL_TOKEN_ADDRESS_MAINNET = '0x84d821F7FbDD595c4C4A50842913e6b1E07d7a53'
const USDT_MAINNET = '0xdac17f958d2ee523a2206206994597c13d831ec7'
const A_USDT_MAINNET = '0x3ed3b47dd13ec9a98b44e6204a523e766b225811'
const SUSHISWAP_MAINNET = '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F'
const AAVE_LENDING_POOL_MAINNET = '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9'
const STAKE_AAVE_MAINNET = '0x4da27a545c0c5b758a6ba100e3a049001de870f5'
const AAVE_MAINNET = '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9'
const AAVE_INCENTIVES_CONTROLLER_MAINNET = '0xd784927Ff2f95ba542BfC824c8a8a98F3495f6b5'


const toTokenAmount = (amount: BigNumberish, tokenDecimal: BigNumberish) => {
  return BigNumber.from(amount).mul(BigNumber.from(10).pow(tokenDecimal))
}

const swapMarketPoolFee = (amount: BigNumberish) => {
  return BigNumber.from(amount)
}

const LENDABLE_TOKEN_USDT_KOVAN = {
  enabled: true,
  tokenContract: USDT_KOVAN,
  swapMarket: SUSHISWAP_KOVAN,
  swapMarketPoolFee: swapMarketPoolFee(3000),
  decimals: USDT_TOKEN_DECIMALS,
  valueMultiplier: toTokenAmount(1, BNPL_TOKEN_DECIMALS), // 1000000000000000000
  unusedFundsLendingMode: 1,
  unusedFundsLendingContract: AAVE_LENDING_POOL_KOVAN,
  unusedFundsLendingToken: A_USDT_KOVAN,
  unusedFundsIncentivesController: AAVE_INCENTIVES_CONTROLLER_KOVAN,
  symbol: 'USDT',
  poolSymbol: 'pUSDT'
}

const LENDABLE_TOKEN_TUSD_KOVAN = {
  enabled: true,
  tokenContract: TUSD_KOVAN,
  swapMarket: SUSHISWAP_KOVAN,
  swapMarketPoolFee: swapMarketPoolFee(3000),
  decimals: TUSD_TOKEN_DECIMALS,
  valueMultiplier: toTokenAmount(1, TUSD_TOKEN_DECIMALS),
  unusedFundsLendingMode: 1,
  unusedFundsLendingContract: AAVE_LENDING_POOL_KOVAN,
  unusedFundsLendingToken: A_TUSD_KOVAN,
  unusedFundsIncentivesController: AAVE_INCENTIVES_CONTROLLER_KOVAN,
  symbol: 'TUSD',
  poolSymbol: 'pTUSD'
}

const LENDABLE_TOKEN_USDT_MAINNET = {
  enabled: true,
  tokenContract: USDT_MAINNET,
  swapMarket: SUSHISWAP_MAINNET,
  swapMarketPoolFee: swapMarketPoolFee(3000),
  decimals: USDT_TOKEN_DECIMALS,
  valueMultiplier: toTokenAmount(1, BNPL_TOKEN_DECIMALS), // 1000000000000000000
  unusedFundsLendingMode: 1,
  unusedFundsLendingContract: AAVE_LENDING_POOL_MAINNET,
  unusedFundsLendingToken: A_USDT_MAINNET,
  unusedFundsIncentivesController: AAVE_INCENTIVES_CONTROLLER_MAINNET,
  symbol: 'USDT',
  poolSymbol: 'pUSDT'
}


const config: { [key: string]: DeployConfig } = {
  'kovan': {
    networkId: '13371337',
    networkName: 'BNPL TESTING',
    bnplTokenAddress: BNPL_TOKEN_ADDRESS_KOVAN,
    minBondingAmount: toTokenAmount(100_000, BNPL_TOKEN_DECIMALS),
    loanOverdueGracePeriod: ONE_WEEK,
    defaultRewardDuration: ONE_WEEK,
    distributorAdmin: 'deployer',
    managerAdmin: 'deployer',
    bankNodeManagerConfigurator: 'deployer',
    lendableTokens: [
      LENDABLE_TOKEN_USDT_KOVAN, LENDABLE_TOKEN_TUSD_KOVAN
    ]
  },
  'mainnet': {
    networkId: '1',
    networkName: 'BNPL MAINNET',
    bnplTokenAddress: BNPL_TOKEN_ADDRESS_MAINNET,
    minBondingAmount: toTokenAmount(2_000_000, BNPL_TOKEN_DECIMALS),
    loanOverdueGracePeriod: ONE_WEEK,
    defaultRewardDuration: ONE_MONTH,
    distributorAdmin: 'deployer',
    managerAdmin: 'deployer',
    bankNodeManagerConfigurator: 'deployer',
    lendableTokens: [
      LENDABLE_TOKEN_USDT_MAINNET
    ]
  }
}

export default config;
