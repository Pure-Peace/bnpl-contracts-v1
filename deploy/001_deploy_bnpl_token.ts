import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const shouldDeployFakeBNPLToken = !hre.network.live;
  if (shouldDeployFakeBNPLToken) {
    const { bnplTokenDeployer, } = await getNamedAccounts();

    await deploy('BNPLToken', {
      from: bnplTokenDeployer,
      args: [],
      log: true,
      skipIfAlreadyDeployed: false,
    });
  }
};
export default func;
func.id = "deploy_bnpl_token";
func.tags = ['BNPLToken'];
