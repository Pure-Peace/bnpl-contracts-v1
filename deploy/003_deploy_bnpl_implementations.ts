import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction, DeployResult } from 'hardhat-deploy/types';
import { getContractForEnvironment } from '../test/utils/getContractForEnvironment';
import { BNPLToken } from '../typechain';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { protocolDeployer } = await getNamedAccounts();

  const bnplToken = await getContractForEnvironment<BNPLToken>(hre, "BNPLToken");

  const easyDeployProtoDep = async (name: string, contract?: string, args: string[] = []): Promise<DeployResult> => {

    const result = await deploy(name, {
      contract: contract,
      from: protocolDeployer,
      args: args,
      log: true,
      skipIfAlreadyDeployed: false,
      gasLimit: 5500000,
    });
    return result;

  };

  const ImplBankNodeManager = await easyDeployProtoDep("ImplBankNodeManager", "BankNodeManager");
  const UpBeaconBankNodeManager = await easyDeployProtoDep("UpBeaconBankNodeManager", "UpgradeableBeacon", [ImplBankNodeManager.address]);

  const ImplBankNodeLendingRewards = await easyDeployProtoDep("ImplBankNodeLendingRewards", "BankNodeLendingRewards");
  const UpBeaconBankNodeLendingRewards = await easyDeployProtoDep("UpBeaconBankNodeLendingRewards", "UpgradeableBeacon", [ImplBankNodeLendingRewards.address]);




  const ImplBNPLBankNode = await easyDeployProtoDep("ImplBNPLBankNode", "BNPLBankNode");
  const UpBeaconBNPLBankNode = await easyDeployProtoDep("UpBeaconBNPLBankNode", "UpgradeableBeacon", [ImplBNPLBankNode.address]);


  const ImplBNPLStakingPool = await easyDeployProtoDep("ImplBNPLStakingPool", "BNPLStakingPool");
  const UpBeaconBNPLStakingPool = await easyDeployProtoDep("UpBeaconBNPLStakingPool", "UpgradeableBeacon", [ImplBNPLStakingPool.address]);



  const ImplPoolTokenUpgradeable = await easyDeployProtoDep("ImplPoolTokenUpgradeable", "PoolTokenUpgradeable");
  const UpBeaconBankNodeLendingPoolToken = await easyDeployProtoDep("UpBeaconBankNodeLendingPoolToken", "UpgradeableBeacon", [ImplPoolTokenUpgradeable.address]);
  const UpBeaconBankNodeStakingPoolToken = await easyDeployProtoDep("UpBeaconBankNodeStakingPoolToken", "UpgradeableBeacon", [ImplPoolTokenUpgradeable.address]);





};
export default func;
func.id = "deploy_bnpl_implementations";
func.tags = ['BNPLImplementations'];
