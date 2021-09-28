import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployedContract, DeployFunction } from 'hardhat-deploy/types';
import { getContractForEnvironment } from '../test/utils/getContractForEnvironment';
import { BankNodeManager, BNPLToken } from '../typechain';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { protocolDeployer, bnplTokenDeployer, protocolAdmin } = await getNamedAccounts();

  const bnplToken = await getContractForEnvironment<BNPLToken>(hre, "BNPLToken", bnplTokenDeployer);
  const UpBeaconBankNodeManager = await deployments.get("UpBeaconBankNodeManager");
  const UpBeaconBNPLBankNode = await deployments.get("UpBeaconBNPLBankNode");
  const UpBeaconBNPLStakingPool = await deployments.get("UpBeaconBNPLStakingPool");
  const UpBeaconBankNodeLendingPoolToken = await deployments.get("UpBeaconBankNodeLendingPoolToken");
  const UpBeaconBankNodeStakingPoolToken = await deployments.get("UpBeaconBankNodeStakingPoolToken");
  const UpBeaconBankNodeLendingRewards = await deployments.get("UpBeaconBankNodeLendingRewards");



  const BankNodeManagerProxy = await deploy("BankNodeManagerProxy", {
    contract: "BeaconProxy",
    from: protocolDeployer,
    args: [UpBeaconBankNodeManager.address, []],
    log: true,
    skipIfAlreadyDeployed: false,
  });

  const BankNodeLendingRewardsProxy = await deploy("BankNodeLendingRewardsProxy", {
    contract: "BeaconProxy",
    from: protocolDeployer,
    args: [UpBeaconBankNodeLendingRewards.address, []],
    log: true,
    skipIfAlreadyDeployed: false,
  });


  const BNPLProtocolConfig = await deploy("BNPLProtocolConfig", {
    contract: "BNPLProtocolConfig",
    from: protocolDeployer,
    args: [
      hre.network.live ? 1 : 13371337,
      hre.network.live ? "BNPL MAINNET" : "BNPL TESTING",
      bnplToken.address,
      UpBeaconBankNodeManager.address,

      UpBeaconBNPLBankNode.address,
      UpBeaconBankNodeLendingPoolToken.address,


      UpBeaconBNPLStakingPool.address,
      UpBeaconBankNodeStakingPoolToken.address,
      UpBeaconBankNodeLendingRewards.address,

      BankNodeManagerProxy.address
    ],
    log: true,
    skipIfAlreadyDeployed: false,
  });





};
export default func;
func.id = "deploy_bnpl_protocol";
func.tags = ['BNPLProtocolDeploy'];
