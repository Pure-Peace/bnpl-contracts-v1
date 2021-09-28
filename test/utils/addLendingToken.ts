import { HardhatRuntimeEnvironment } from "hardhat/types";
import { IAaveLendingPool, IBankNodeManager, IBNPLSwapMarket, IERC20 } from "../../typechain";
import { getContractForEnvironment } from "./getContractForEnvironment";
async function addLendingToken(
  lendableToken: {
    tokenContract: string,
    swapMarket: string,
    swapMarketPoolFee: string,
    decimals: string,
    valueMultiplier: string,
    unusedFundsLendingMode: string,
    unusedFundsLendingContract: string,
    unusedFundsLendingToken: string,
    symbol: string,
    poolSymbol: string,
  },
  enabled = true
) {



}
async function addLendingTokens(hre: HardhatRuntimeEnvironment) {
  const AaveLendingPool = await getContractForEnvironment<IAaveLendingPool>(hre, "AaveLendingPool");
  const UniswapV3Router = await getContractForEnvironment<IBNPLSwapMarket>(hre, "UniswapV3Router");

  const lendableTokenDAI = {
    tokenContract: (await getContractForEnvironment<IERC20>(hre, "DAI")).address,
    swapMarket: UniswapV3Router.address,
    swapMarketPoolFee: 3000,
    decimals: 18,
    valueMultiplier: "1000000000000000000",
    unusedFundsLendingMode: 1,
    unusedFundsLendingContract: AaveLendingPool.address,
    unusedFundsLendingToken: (await getContractForEnvironment<IERC20>(hre, "aDAI")).address,
    symbol: "DAI",
    poolSymbol: "pDAI",
  };

  const lendableTokenUSDT = {
    tokenContract: (await getContractForEnvironment<IERC20>(hre, "aUSDT")).address,
    swapMarket: UniswapV3Router.address,
    swapMarketPoolFee: 3000,
    decimals: 6,
    valueMultiplier: "1000000000000000000",
    unusedFundsLendingMode: 1,
    unusedFundsLendingContract: AaveLendingPool.address,
    unusedFundsLendingToken: (await getContractForEnvironment<IERC20>(hre, "aUSDT")).address,
    symbol: "USDT",
    poolSymbol: "pUSDT",
  };

  const lendableTokenUSDC = {
    tokenContract: (await getContractForEnvironment<IERC20>(hre, "USDC")).address,
    swapMarket: UniswapV3Router.address,
    swapMarketPoolFee: 3000,
    decimals: 18,
    valueMultiplier: "1000000000000000000",
    unusedFundsLendingMode: 1,
    unusedFundsLendingContract: AaveLendingPool.address,
    unusedFundsLendingToken: (await getContractForEnvironment<IERC20>(hre, "aUSDC")).address,
    symbol: "USDC",
    poolSymbol: "pUSDC",
  };

  const BankNodeManager = await getContractForEnvironment<IBankNodeManager>(hre, "BankNodeManager");




}
