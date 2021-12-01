
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployedContract, DeployFunction } from 'hardhat-deploy/types';
import { getContractForEnvironment } from '../test/utils/getContractForEnvironment';
import { BankNodeManager, BNPLToken } from '../typechain';
import { setupMockEnvIfNeeded } from '../test/utils/setupMockEnv';
import { setupProtocol } from '../test/utils/protocolSetup';
import { addLendableTokens } from '../test/utils/addLendableTokens';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { protocolDeployer, bnplTokenDeployer, protocolAdmin } = await getNamedAccounts();
  if (hre.network.name !== "hardhat") {
    console.log("setting up mock env on network: " + hre.network.name);
    await setupMockEnvIfNeeded(hre);

    await setupProtocol(hre);

    await addLendableTokens(hre);


  } else {
  }




};
export default func;
func.id = "deploy_bnpl_protocol_eco";
func.tags = ['BNPLProtocolDeployEco'];
