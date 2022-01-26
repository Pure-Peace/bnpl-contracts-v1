import { HardhatRuntimeEnvironment } from "hardhat/types";
import { BankNodeManager, FakeAaveLendingPool, FakeAaveStakedTokenIncentivesController, IAaveLendingPool, IBankNodeManager, IBNPLSwapMarket, IERC20 } from "../../typechain";
import { getContractForEnvironment } from "./getContractForEnvironment";

async function addLendableTokens(hre: HardhatRuntimeEnvironment) {
  const AaveLendingPool = await getContractForEnvironment<FakeAaveLendingPool>(hre, "AaveLendingPool");
  const AaveIncentivesController = { address: '0x0000000000000000000000000000000000000000' } //await getContractForEnvironment<FakeAaveStakedTokenIncentivesController>(hre, "AaveIncentivesController");
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
    unusedFundsIncentivesController: AaveIncentivesController.address,
    symbol: "DAI",
    poolSymbol: "pDAI",
  };

  const lendableTokenUSDT = {
    tokenContract: (await getContractForEnvironment<IERC20>(hre, "USDT")).address,
    swapMarket: UniswapV3Router.address,
    swapMarketPoolFee: 3000,
    decimals: 6,
    valueMultiplier: "1000000000000000000",
    unusedFundsLendingMode: 1,
    unusedFundsLendingContract: AaveLendingPool.address,
    unusedFundsLendingToken: (await getContractForEnvironment<IERC20>(hre, "aUSDT")).address,
    unusedFundsIncentivesController: AaveIncentivesController.address,
    symbol: "USDT",
    poolSymbol: "pUSDT",
  };

  const lendableTokenUSDC = {
    tokenContract: (await getContractForEnvironment<IERC20>(hre, "USDC")).address,
    swapMarket: UniswapV3Router.address,
    swapMarketPoolFee: 3000,
    decimals: 6,
    valueMultiplier: "1000000000000000000",
    unusedFundsLendingMode: 1,
    unusedFundsLendingContract: AaveLendingPool.address,
    unusedFundsLendingToken: (await getContractForEnvironment<IERC20>(hre, "aUSDC")).address,
    unusedFundsIncentivesController: AaveIncentivesController.address,
    symbol: "USDC",
    poolSymbol: "pUSDC",
  };
  const { protocolAdmin } = await hre.getNamedAccounts();
  /*
    await AaveLendingPool.addAssetPair(
      lendableTokenDAI.tokenContract,
      lendableTokenDAI.unusedFundsLendingToken,
    );
    await AaveLendingPool.addAssetPair(
      lendableTokenUSDT.tokenContract,
      lendableTokenUSDT.unusedFundsLendingToken,
    );
    await AaveLendingPool.addAssetPair(
      lendableTokenUSDC.tokenContract,
      lendableTokenUSDC.unusedFundsLendingToken,
    );
  */
  const BankNodeManager = await getContractForEnvironment<BankNodeManager>(hre, "BankNodeManager", protocolAdmin);
  await BankNodeManager.addLendableToken(lendableTokenDAI, 1, { gasLimit: 5500000 });
  await BankNodeManager.addLendableToken(lendableTokenUSDT, 1, { gasLimit: 5500000 });
  await BankNodeManager.addLendableToken(lendableTokenUSDC, 1, { gasLimit: 5500000 });




}
async function addLendableTokensTestNet(hre: HardhatRuntimeEnvironment) {
  const AaveLendingPool = await getContractForEnvironment<FakeAaveLendingPool>(hre, "AaveLendingPool");
  const AaveIncentivesController = { address: '0x0000000000000000000000000000000000000000' } // await getContractForEnvironment<FakeAaveStakedTokenIncentivesController>(hre, "AaveIncentivesController");
  const UniswapV3Router = await getContractForEnvironment<IBNPLSwapMarket>(hre, "UniswapV3Router");

  /*
    const lendableTokenUSDT = {
      tokenContract: (await getContractForEnvironment<IERC20>(hre, "USDT")).address,
      swapMarket: UniswapV3Router.address,
      swapMarketPoolFee: 3000,
      decimals: 6,
      valueMultiplier: "1000000000000000000",
      unusedFundsLendingMode: 1,
      unusedFundsLendingContract: AaveLendingPool.address,
      unusedFundsLendingToken: (await getContractForEnvironment<IERC20>(hre, "aUSDT")).address,
      unusedFundsIncentivesController: AaveIncentivesController.address,
      symbol: "USDT",
      poolSymbol: "pUSDT",
    };
    console.log("lendableTokenUSDT", lendableTokenUSDT)*/


  const lendableTokenTUSD = {
    tokenContract: (await getContractForEnvironment<IERC20>(hre, "TUSD")).address,
    swapMarket: UniswapV3Router.address,
    swapMarketPoolFee: 3000,
    decimals: 18,
    valueMultiplier: "1000000000000000000",
    unusedFundsLendingMode: 1,
    unusedFundsLendingContract: AaveLendingPool.address,
    unusedFundsLendingToken: (await getContractForEnvironment<IERC20>(hre, "aTUSD")).address,
    unusedFundsIncentivesController: AaveIncentivesController.address,
    symbol: "TUSD",
    poolSymbol: "pTUSD",
  };


  const { protocolAdmin } = await hre.getNamedAccounts();
  /*
    await AaveLendingPool.addAssetPair(
      lendableTokenDAI.tokenContract,
      lendableTokenDAI.unusedFundsLendingToken,
    );
    await AaveLendingPool.addAssetPair(
      lendableTokenUSDT.tokenContract,
      lendableTokenUSDT.unusedFundsLendingToken,
    );
    await AaveLendingPool.addAssetPair(
      lendableTokenUSDC.tokenContract,
      lendableTokenUSDC.unusedFundsLendingToken,
    );
  */
  const BankNodeManager = await getContractForEnvironment<BankNodeManager>(hre, "BankNodeManager", protocolAdmin);
  await BankNodeManager.addLendableToken(lendableTokenTUSD, 1, { gasLimit: 5500000 });




}

export {
  addLendableTokens,
  addLendableTokensTestNet,
}
