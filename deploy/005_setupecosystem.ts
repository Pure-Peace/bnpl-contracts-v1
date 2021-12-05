
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployedContract, DeployFunction } from 'hardhat-deploy/types';
import { getContractForEnvironment } from '../test/utils/getContractForEnvironment';
import { BankNodeManager, BNPLToken } from '../typechain';
import { setupMockEnvIfNeeded } from '../test/utils/setupMockEnv';
import { setupProtocol } from '../test/utils/protocolSetup';
import { addLendableTokens } from '../test/utils/addLendableTokens';
import { setupTestEnv } from '../test/utils/testnetEnvSeup';
import { ms } from '../utils/math';
import { BigNumber } from 'ethers';

const func = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { protocolDeployer, bnplTokenDeployer, protocolAdmin } = await getNamedAccounts();
  if (hre.network.name !== "hardhat") {
    console.log("setting up mock env on network: " + hre.network.name);
    const result = await setupTestEnv(hre);

    const { users, h } = result;
    const u = users;

    const startBondedBNPLAmount = ms`1000000*10^18`;
    const startStakedBNPLAmount = ms`500000*10^18`;
    const startTotalBNPL = BigNumber.from(startBondedBNPLAmount).add(startStakedBNPLAmount);
    const startLiquidityAmount = ms`100000*10^18`;
    const bankNodeIdA = await h.setupBankNode(
      u.bankNodeMakerA as any,
      "USDT",
      startBondedBNPLAmount,
      "Test Node A",
      "https://test-node-a.example.com"
    );
    const makerASC = await h.getSubContractsForBankNodeWithSigner(bankNodeIdA, u.bankNodeMakerA)
    const makerFinStatesStart = await h.getKeyUserBalancesForBankNode(u.bankNodeMakerA, bankNodeIdA);
    await h.stakeBNPLToBankNode(u.stakerA1, bankNodeIdA, startStakedBNPLAmount);

    await h.stakeLendingCoinToBankNode(u.lenderA1, bankNodeIdA, startLiquidityAmount, "USDT");
    const finStatesStart = await h.getBankNodeAllFinancialStates(bankNodeIdA);
    console.log(finStatesStart)




  } else {
  }




};
export default func;
