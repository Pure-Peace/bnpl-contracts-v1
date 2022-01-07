import hre from 'hardhat';
import { ContractTransaction } from 'ethers'
import { DeployResult } from 'hardhat-deploy/types';
import { GAS_LIMIT } from './constants';


const { deployments } = hre;
const { deploy: _dep } = deployments;

export async function setup() {
  const accounts = await hre.ethers.getSigners();
  const deployer = accounts[0];
  console.log('Deploying on network:', hre.network.name);
  console.log('Deployer:', deployer.address);
  console.log(
    'Deployer balance:',
    hre.ethers.utils.formatEther(await deployer.getBalance()).toString(),
    'ETH'
  );

  return {
    accounts,
    deployer,
    deploy: async (
      deployName: string,
      contractName: string,
      args: string[] = []
    ): Promise<DeployResult> => {
      console.log(
        `\n>> Deploying contract "${deployName}" ("${contractName}")...`
      );
      const deployResult = await _dep(deployName, {
        contract: contractName,
        args: args,
        log: true,
        skipIfAlreadyDeployed: false,
        gasLimit: GAS_LIMIT,
        from: deployer.address
      });
      console.log(
        `${deployResult.newlyDeployed ? '[New]' : '[Reused]'
        } contract "${deployName}" ("${contractName}") deployed at "${deployResult.address
        }" \n - tx: "${deployResult.transactionHash}" \n - gas: ${deployResult.receipt?.gasUsed
        } \n - deployer: "${deployer.address}"`
      );
      return deployResult;
    }
  };
}

export function waitContractCall(transcation: ContractTransaction): Promise<void> {
  return new Promise<void>((resolve) => {
    transcation.wait().then((receipt) => {
      console.log(`Waiting transcation: "${receipt.transactionHash}" (block: ${receipt.blockNumber} gasUsed: ${receipt.gasUsed})`)
      if (receipt.status === 1) {
        return resolve()
      }
    })
  })
}
