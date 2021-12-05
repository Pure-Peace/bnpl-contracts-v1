import { HardhatRuntimeEnvironment } from "hardhat/types";
import { BankNodeLendingRewards, BankNodeManager, BNPLKYCStore, BNPLProtocolConfig } from "../../typechain";
import { getContractForEnvironment } from "./getContractForEnvironment";


// 100,000 BNPL Min bonding amount
async function setupProtocol(hre: HardhatRuntimeEnvironment, minBondingAmount = "100000000000000000000000") {

  const { protocolDeployer, protocolAdmin } = await hre.getNamedAccounts();


  const BankNodeManager = await getContractForEnvironment<BankNodeManager>(hre, "BankNodeManager", protocolDeployer);
  const BNPLProtocolConfig = await getContractForEnvironment<BNPLProtocolConfig>(hre, "BNPLProtocolConfig", protocolDeployer);
  const BankNodeLendingRewards = await getContractForEnvironment<BankNodeLendingRewards>(hre, "BankNodeLendingRewards", protocolDeployer);
  console.log("isetup: ")
  const BNPLKYCStore = await getContractForEnvironment<BNPLKYCStore>(hre, "BNPLKYCStore", protocolDeployer);

  await BankNodeManager.initialize(
    BNPLProtocolConfig.address,
    protocolAdmin,
    minBondingAmount,

    BankNodeLendingRewards.address,
    BNPLKYCStore.address,
    { gasLimit: 5500000 }
  );

  await BankNodeLendingRewards.initialize(
    (60 * 60 * 24 * 7),
    (await BNPLProtocolConfig.bnplToken()),
    BankNodeManager.address,
    protocolAdmin,
    protocolAdmin,


    { gasLimit: 5500000 }
  );


}

async function setupProtocolTestNet(hre: HardhatRuntimeEnvironment, minBondingAmount = "100000000000000000000000") {

  const { protocolDeployer, protocolAdmin } = await hre.getNamedAccounts();


  const BankNodeManager = await getContractForEnvironment<BankNodeManager>(hre, "BankNodeManager", protocolDeployer);
  const BNPLProtocolConfig = await getContractForEnvironment<BNPLProtocolConfig>(hre, "BNPLProtocolConfig", protocolDeployer);
  const BankNodeLendingRewards = await getContractForEnvironment<BankNodeLendingRewards>(hre, "BankNodeLendingRewards", protocolDeployer);

  const BNPLKYCStore = await getContractForEnvironment<BNPLKYCStore>(hre, "BNPLKYCStore", protocolDeployer);


  await BankNodeManager.initialize(
    BNPLProtocolConfig.address,
    protocolAdmin,
    minBondingAmount,
    BankNodeLendingRewards.address,
    BNPLKYCStore.address,

    { gasLimit: 5500000 }
  );

  await BankNodeLendingRewards.initialize(
    (60 * 60 * 24 * 7),
    (await BNPLProtocolConfig.bnplToken()),
    BankNodeManager.address,
    protocolAdmin,
    protocolAdmin, { gasLimit: 5500000 }
  );


}

export {
  setupProtocol,
  setupProtocolTestNet,
}
