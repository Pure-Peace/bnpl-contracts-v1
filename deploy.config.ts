/* eslint-disable @typescript-eslint/no-unused-vars */
import { BigNumber, BigNumberish } from "ethers";

type DeployConfig = {
  networkId: string,
  networkName: string,
  bnplTokenAddress: string,
  minBondingAmount: BigNumber,
  defaultRewardDuration: number,
  distributorAdmin: string,
  managerAdmin: string,
  bankNodeManagerConfigurator: string,
  lendableTokens: LendableTokenConfig[]
}

type LendableTokenConfig = {
  enabled: boolean,
  tokenContract: string,
  swapMarket: string,
  swapMarketPoolFee: BigNumber,
  decimals: number,
  valueMultiplier: BigNumber,
  unusedFundsLendingMode: number,
  unusedFundsLendingContract: string,
  unusedFundsLendingToken: string,
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
const TUSD_TOKEN_DECIMALS = 18;
const BNPL_TOKEN_DECIMALS = 18

// Kovan addresses
const BNPL_TOKEN_ADDRESS_KOVAN = '0x0c6ec7437657cb501ae35718e5426815e83e9e00';
const TUSD_KOVAN = '0x016750AC630F711882812f24Dba6c95b9D35856d';
const A_TUSD_KOVAN = '0x39914AdBe5fDbC2b9ADeedE8Bcd444b20B039204';
const SUSHISWAP_KOVAN = '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506';
const UNUSED_FUNDS_LENDING_CONTRACT_KOVAN = '0xE0fBa4Fc209b4948668006B2bE61711b7f465bAe'


const toTokenAmount = (amount: BigNumberish, tokenDecimal: BigNumberish) => {
  return BigNumber.from(amount).mul(BigNumber.from(10).mul(tokenDecimal))
}

const swapMarketPoolFee = (amount: BigNumberish) => {
  return BigNumber.from(amount)
}


const config: { [key: string]: DeployConfig } = {
  'kovan': {
    networkId: '13371337',
    networkName: 'BNPL TESTING',
    bnplTokenAddress: BNPL_TOKEN_ADDRESS_KOVAN,
    minBondingAmount: toTokenAmount(100_000, BNPL_TOKEN_DECIMALS),
    defaultRewardDuration: ONE_WEEK,
    distributorAdmin: 'deployer',
    managerAdmin: 'deployer',
    bankNodeManagerConfigurator: 'deployer',
    lendableTokens: [
      {
        enabled: true,
        tokenContract: TUSD_KOVAN,
        swapMarket: SUSHISWAP_KOVAN,
        swapMarketPoolFee: swapMarketPoolFee(3000),
        decimals: TUSD_TOKEN_DECIMALS,
        valueMultiplier: toTokenAmount(1, TUSD_TOKEN_DECIMALS),
        unusedFundsLendingMode: 1,
        unusedFundsLendingContract: UNUSED_FUNDS_LENDING_CONTRACT_KOVAN,
        unusedFundsLendingToken: A_TUSD_KOVAN,
        symbol: 'TUSD',
        poolSymbol: 'pTUSD'
      }
    ]
  }
}

export default config;
