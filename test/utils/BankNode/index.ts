import { BigNumberish } from "ethers";
import { ethers } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { BankNodeLendingRewards, BankNodeManager, BNPLBankNode, BNPLStakingPool, BNPLToken, IERC20, PoolTokenUpgradeable } from "../../../typechain";
import { genGetContractWith } from "../genHelpers";
import { getContractForEnvironment } from "../getContractForEnvironment";
import { setupUsersWithNames } from "../index";

async function getBankNodeContractsForUsers(hre: HardhatRuntimeEnvironment, bankNodeId: BigNumberish) {
  const { getContract, getContractAt } = genGetContractWith(hre);

  const BankNodeManager = await getContractForEnvironment<BankNodeManager>(
    hre,
    "BankNodeManager"
  );
  const BankNodeLendingRewards = await getContractForEnvironment<BankNodeLendingRewards>(
    hre,
    "BankNodeLendingRewards"
  );
  const bankNodeDef = await BankNodeManager.bankNodes(bankNodeId);

  const BNPLBankNode = await getContractAt<BNPLBankNode>(
    "BNPLBankNode",
    bankNodeDef.bankNodeContract,
  );
  const BNPLStakingPool = await getContractAt<BNPLStakingPool>(
    "BNPLStakingPool",
    bankNodeDef.bankNodeContract,
  );
  const BankNodeToken = await getContractAt<PoolTokenUpgradeable>(
    "PoolTokenUpgradeable",
    bankNodeDef.bankNodeToken,
  );
  const BNPLStakingPoolToken = await getContractAt<PoolTokenUpgradeable>(
    "PoolTokenUpgradeable",
    bankNodeDef.bankNodeToken,
  );
  const unboundContracts = {
    BankNodeManager,
    BankNodeLendingRewards,
    BNPLBankNode,
    BNPLStakingPool,
    BankNodeToken,
    BNPLStakingPoolToken,
    DAI: await getContractForEnvironment<IERC20>(hre, "DAI"),
    USDT: await getContractForEnvironment<IERC20>(hre, "USDT"),
    USDC: await getContractForEnvironment<IERC20>(hre, "USDC"),
    BNPLToken: await getContractForEnvironment<BNPLToken>(hre, "BNPLToken"),
  }
  const contracts = await setupUsersWithNames(
    await hre.getNamedAccounts() as any,
    unboundContracts
  )
  return {
    bankNodeDef,
    ...contracts,
  }

}


export {
  getBankNodeContractsForUsers,
}
