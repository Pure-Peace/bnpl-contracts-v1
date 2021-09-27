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



  const BankNodeManagerProxy = await deploy("BankNodeManagerProxy", {
    contract: "BeaconProxy",
    from: protocolDeployer,
    args: [UpBeaconBankNodeManager.address, []],
    log: true,
    skipIfAlreadyDeployed: false,
  });


  const BNPLProtocolConfig = await deploy("BNPLProtocolConfig", {
    contract: "BNPLProtocolConfig",
    from: protocolDeployer,
    args: [
      bnplToken.address,
      UpBeaconBankNodeManager.address,

      UpBeaconBNPLBankNode.address,
      UpBeaconBankNodeLendingPoolToken.address,


      UpBeaconBNPLStakingPool.address,
      UpBeaconBankNodeStakingPoolToken.address,

      BankNodeManagerProxy.address
    ],
    log: true,
    skipIfAlreadyDeployed: false,
  });

  const BankNodeManager = await getContractForEnvironment<BankNodeManager>(hre, "BankNodeManager", protocolDeployer);

  await BankNodeManager.initialize(
    BNPLProtocolConfig.address,
    protocolAdmin,
    "100000000000000000000000" // 100,000 BNPL Min bonding amount
  );











  /*


          UpgradeableBeacon upBeaconBankNodeManager = new UpgradeableBeacon(params.implBankNodeManager);
          BankNodeManager bankNodeManager = BankNodeManager(address(new BeaconProxy(address(upBeaconBankNodeManager),"")));
          BNPLProtocolConfig protocolConfig = new BNPLProtocolConfig(
              params.bnplToken,

              upBeaconBankNodeManager,

              new UpgradeableBeacon(params.implBankNode),
              new UpgradeableBeacon(params.implBankNodeLendingPoolToken),

              new UpgradeableBeacon(params.implBankNodeStakingPool),
              new UpgradeableBeacon(params.implBankNodeStakingPoolToken),

              bankNodeManager
          );

          bankNodeManager.initialize(protocolConfig, params.configurator, params.minimumBankNodeBondedAmount);



          */


};
export default func;
func.id = "deploy_bnpl_protocol";
func.tags = ['BNPLProtocol'];
