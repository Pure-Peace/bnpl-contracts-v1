/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-var-requires */
import hre from 'hardhat';
import { Contract, ContractTransaction, Signer } from 'ethers'
import { DeployResult } from 'hardhat-deploy/types';
import fs from 'fs'
import path from 'path'

import { GAS_LIMIT } from './constants';
import { getContractForEnvironment } from '../test/utils/getContractForEnvironment';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import {
  BankNodeLendingRewards,
  BankNodeManager,
  BNPLProtocolConfig,
} from '../typechain';
import { ContractList, IMPL_PREFIX, PROXY_CONTRACTS, UPBEACON_PREFIX, UPGRADEABLE_CONTRACTS, ZERO_ADDRESS } from './constants';

import NETWORK_DEPLOY_CONFIG, { DeployConfig } from '../deploy.config'

require('dotenv').config();
const prompts = require('prompts')

const { deploy: _dep } = hre.deployments;

let __DEPLOY_CONFIG: DeployConfig
export function deployConfig() {
  if (__DEPLOY_CONFIG) return __DEPLOY_CONFIG
  __DEPLOY_CONFIG = NETWORK_DEPLOY_CONFIG[hre.network.name]
  if (!__DEPLOY_CONFIG) {
    throw new Error(`Unconfigured network: "${hre.network.name}"`)
  }
  return __DEPLOY_CONFIG
}

export type DeployFunction = (
  deployName: string,
  contractName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args?: string[] | any[]
) => Promise<DeployResult>;
export type Deployments = { [key: string]: DeployResult };


export async function setup(): Promise<{
  accounts: SignerWithAddress[];
  deployer: SignerWithAddress;
  deploy: (deployName: string, contractName: string, args?: string[]) => Promise<DeployResult>;
}> {
  const accounts = await hre.ethers.getSigners();
  const deployer = accounts[0];
  console.log('Network:', hre.network.name);
  console.log('Signer:', deployer.address);
  console.log(
    'Signer balance:',
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

export async function tryGetContractForEnvironment<T extends Contract>(contractName: string, deployer: Signer): Promise<{ err: any, contract: T | undefined }> {
  const result: { err: any, contract: T | undefined } = {
    err: undefined,
    contract: undefined
  }
  try {
    result.contract = (await getContractForEnvironment(hre, contractName as any, deployer)) as T
    return result
  } catch (err) {
    result.err = err
  }
  try {
    const basePath = `./deployments/${hre.network.name}`
    const deployment = JSON.parse(fs.readFileSync(path.join(basePath, `${contractName}.json`)).toString())
    result.contract = (await hre.ethers.getContractAt(deployment.abi, deployment.address, deployer)) as unknown as T
    return result
  } catch (err2) {
    result.err = err2
  }
  return result
}


export async function getContractAt<T extends Contract>(contractName: string, address: string, signer?: string | Signer | undefined): Promise<T> {
  const realSigner = (typeof signer === 'string' ? (await hre.ethers.getSigner(signer)) : signer);
  try {
    const contract = await hre.deployments.get(contractName);
    return hre.ethers.getContractAt(contract.abi, address, realSigner) as Promise<T>;
  } catch (err) {
    return hre.ethers.getContractAt(contractName, address, realSigner) as Promise<T>;
  }
}

export async function getContractFromEnvOrPrompts<T extends Contract>({ contractNameEnv, contractName }: { contractNameEnv: string, contractName?: string }, deployer: Signer): Promise<T> {
  console.log(`\nGetting contract "${contractNameEnv}"...`)
  const { contract, err } = await tryGetContractForEnvironment<T>(contractNameEnv, deployer)
  if (!contract) {
    const { contractAddress } = await prompts({
      type: 'text',
      name: 'contractAddress',
      message: 'Unable to find the contract from the environment, please enter the address manually:'
    })
    return await getContractAt<T>(contractName || contractNameEnv, contractAddress, deployer)
  }
  return contract
}

export function nullOrDeployer(address: string | undefined | null, deployer: SignerWithAddress): string {
  if (!address || address === 'deployer') return deployer.address
  return address
}

export async function deployImpl(deploy: DeployFunction, contracts: ContractList) {
  const results: Deployments = {};
  for (const i of contracts) {
    const key = typeof i !== 'string' ? Object.keys(i)[0] : i;
    const n = `Impl${key}`;
    results[n] = await deploy(n, key);
  }
  return results;
}

export async function deployUpBeacon(
  deploy: DeployFunction,
  contracts: ContractList,
  implDeployments: Deployments
) {
  const results: Deployments = {};
  for (const i of contracts) {
    const key = typeof i !== 'string' ? Object.keys(i)[0] : i;
    if (typeof i !== 'string') {
      for (const child of i[key]) {
        const n = `${UPBEACON_PREFIX}${child}`;
        results[n] = await deploy(n, 'UpgradeableBeacon', [
          implDeployments[`${IMPL_PREFIX}${key}`].address
        ]);
      }
    } else {
      const n = `${UPBEACON_PREFIX}${key}`;
      results[n] = await deploy(n, 'UpgradeableBeacon', [
        implDeployments[`${IMPL_PREFIX}${key}`].address
      ]);
    }
  }
  return results;
}

export async function deployBeaconProxy(
  deploy: DeployFunction,
  contracts: ContractList,
  upBeaconDeployments: Deployments
) {
  const results: Deployments = {};
  for (const i of contracts) {
    const key = typeof i !== 'string' ? Object.keys(i)[0] : i;
    if (typeof i !== 'string') {
      for (const child of i[key]) {
        const n = `${child}Proxy`;
        results[n] = await deploy(n, 'BeaconProxy', [
          upBeaconDeployments[`${UPBEACON_PREFIX}${key}`].address,
          []
        ]);
      }
    } else {
      const n = `${key}Proxy`;
      results[n] = await deploy(n, 'BeaconProxy', [
        upBeaconDeployments[`${UPBEACON_PREFIX}${key}`].address,
        []
      ]);
    }
  }
  return results;
}

export async function deployContracts(deploy: DeployFunction) {
  console.log('\n>>>>>>>>> Deploying contracts...\n');
  const implDeployments = await deployImpl(deploy, UPGRADEABLE_CONTRACTS);
  const upBeaconDeployments = await deployUpBeacon(
    deploy,
    UPGRADEABLE_CONTRACTS,
    implDeployments
  );
  const beaconProxyDeployments = await deployBeaconProxy(
    deploy,
    PROXY_CONTRACTS,
    upBeaconDeployments
  );

  const BNPLProtocolConfigDepResult = await deploy(
    'BNPLProtocolConfig',
    'BNPLProtocolConfig',
    [
      deployConfig().networkId,
      deployConfig().networkName,
      deployConfig().bnplTokenAddress,
      upBeaconDeployments.UpBeaconBankNodeManager.address,
      upBeaconDeployments.UpBeaconBNPLBankNode.address,
      upBeaconDeployments.UpBeaconBankNodeLendingPoolToken.address,
      upBeaconDeployments.UpBeaconBNPLStakingPool.address,
      upBeaconDeployments.UpBeaconBankNodeStakingPoolToken.address,
      upBeaconDeployments.UpBeaconBankNodeLendingRewards.address,
      upBeaconDeployments.UpBeaconBNPLKYCStore.address,
      beaconProxyDeployments.BankNodeManagerProxy.address
    ]
  );

  return {
    implDeployments,
    upBeaconDeployments,
    beaconProxyDeployments,
    BNPLProtocolConfigDepResult
  };
}

export async function getDeployedContracts(
  deployer: SignerWithAddress
) {
  console.log('\n>>>>>>>>> Getting deployed contracts...\n');
  const BankNodeManager = await getContractForEnvironment<BankNodeManager>(
    hre,
    'BankNodeManager',
    deployer
  );
  const BNPLProtocolConfig =
    await getContractForEnvironment<BNPLProtocolConfig>(
      hre,
      'BNPLProtocolConfig',
      deployer
    );
  const BankNodeLendingRewards =
    await getContractForEnvironment<BankNodeLendingRewards>(
      hre,
      'BankNodeLendingRewards',
      deployer
    );
  return { BankNodeManager, BNPLProtocolConfig, BankNodeLendingRewards };
}

export async function initializeBankNodeManager(
  BankNodeManager: BankNodeManager,
  BNPLProtocolConfig: BNPLProtocolConfig,
  beaconProxyDeployments: Deployments,
  deployer: SignerWithAddress
) {
  console.log('\n>>>>>>>>> Initializing BankNodeManager...\n');
  if (
    (await BankNodeManager.bnplToken()) !== ZERO_ADDRESS
  ) {
    console.log('BankNodeManager is already initialized!');
    return;
  }
  await waitContractCall(await BankNodeManager.initialize(
    BNPLProtocolConfig.address,
    nullOrDeployer(deployConfig().bankNodeManagerConfigurator, deployer),
    deployConfig().minBondingAmount,
    deployConfig().loanOverdueGracePeriod,
    beaconProxyDeployments.BankNodeLendingRewardsProxy.address,
    beaconProxyDeployments.BNPLKYCStoreProxy.address
  ));
  console.log('BankNodeManager >> DONE')
}

export async function initializeBankNodeLendingRewards(
  BankNodeManager: BankNodeManager,
  BankNodeLendingRewards: BankNodeLendingRewards,
  BNPLProtocolConfig: BNPLProtocolConfig,
  deployer: SignerWithAddress
) {
  console.log('\n>>>>>>>>> Initializing BankNodeLendingRewards...\n');
  if (
    (await BankNodeLendingRewards.bankNodeManager()) !== ZERO_ADDRESS
  ) {
    console.log('BankNodeLendingRewards is already initialized!');
    return;
  }
  await waitContractCall(await BankNodeLendingRewards.initialize(
    deployConfig().defaultRewardDuration,
    await BNPLProtocolConfig.bnplToken(),
    BankNodeManager.address,
    nullOrDeployer(deployConfig().distributorAdmin, deployer),
    nullOrDeployer(deployConfig().managerAdmin, deployer)
  ));
  console.log('BankNodeLendingRewards >> DONE')
}

export async function addLendableTokens(BankNodeManager: BankNodeManager) {
  console.log('\n>>>>>>>>> Add lendable tokens...\n');
  let num = 0
  for (const lendableToken of deployConfig().lendableTokens) {
    console.log(` - (${++num}/${deployConfig().lendableTokens.length}) Adding lendable token "${lendableToken.symbol}" ("${lendableToken.tokenContract}")...\n`)
    await waitContractCall(await BankNodeManager.addLendableToken(lendableToken, lendableToken.enabled ? 1 : 0));
  }
  console.log('lendable tokens >> DONE')
}

export async function initializeContracts(
  deployments: {
    implDeployments: Deployments;
    upBeaconDeployments: Deployments;
    beaconProxyDeployments: Deployments;
  },
  deployedContracts: {
    BankNodeManager: BankNodeManager;
    BNPLProtocolConfig: BNPLProtocolConfig;
    BankNodeLendingRewards: BankNodeLendingRewards;
  },
  deployer: SignerWithAddress
) {
  const { BankNodeManager, BNPLProtocolConfig, BankNodeLendingRewards } =
    deployedContracts;
  await initializeBankNodeManager(
    BankNodeManager,
    BNPLProtocolConfig,
    deployments.beaconProxyDeployments,
    deployer
  );
  await initializeBankNodeLendingRewards(
    BankNodeManager,
    BankNodeLendingRewards,
    BNPLProtocolConfig,
    deployer
  );
  await addLendableTokens(BankNodeManager);
}

export async function deployAndSetupBNPLContracts() {
  const { deployer, deploy } = await setup();
  const deployments = await deployContracts(deploy);
  const deployedContracts = await getDeployedContracts(deployer);
  await initializeContracts(deployments, deployedContracts, deployer);
  console.log('>>> CONTRACTS SETUP DONE <<<');
}
