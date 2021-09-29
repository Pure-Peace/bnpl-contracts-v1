import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { genGetContractWith } from '../test/utils/genHelpers';
import { MintableDebugToken } from '../typechain/MintableDebugToken';
import { mstr } from '../utils/math';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const shouldDeployFakeBNPLToken = !hre.network.live;
  if (shouldDeployFakeBNPLToken) {
    const { bnplTokenDeployer, } = await getNamedAccounts();
    /*
        await deploy('BNPLToken', {
          from: bnplTokenDeployer,
          args: [],
          log: true,
          skipIfAlreadyDeployed: false,
        });
    */
    const bnplTokenOG = await deploy('BNPLToken', {
      from: bnplTokenDeployer,
      contract: "MintableDebugToken",
      args: [],
      log: true,
      skipIfAlreadyDeployed: false,
    });
    const { getContract, getContractAt } = genGetContractWith(hre);
    const bnplToken = await getContractAt<MintableDebugToken>("MintableDebugToken", bnplTokenOG.address, bnplTokenDeployer);
    await bnplToken.initialize(
      "BNPL Token",
      "BNPL",
      18,
      bnplTokenDeployer,
      bnplTokenDeployer
    );
    await bnplToken.mint(bnplTokenDeployer, mstr`10000000000*10^18`);



  }
};
export default func;
func.id = "deploy_bnpl_token";
func.tags = ['BNPLToken'];
