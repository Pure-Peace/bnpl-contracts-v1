#!/usr/bin/env node
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import hre from 'hardhat';
import { DeployResult } from 'hardhat-deploy/types';
import { getContractForEnvironment } from '../test/utils/getContractForEnvironment';
import { setup, waitContractCall } from './utils'

import {
  BankNodeLendingRewards,
  BankNodeManager,
  BNPLProtocolConfig,
} from '../typechain';
import { ContractList, IMPL_PREFIX, PROXY_CONTRACTS, UPBEACON_PREFIX, UPGRADEABLE_CONTRACTS, ZERO_ADDRESS } from './constants';

import deployConfig from '../deploy.config'

require('dotenv').config();

const DEPLOY_CONFIG = deployConfig[hre.network.name]
if (!DEPLOY_CONFIG) {
  throw new Error(`Unconfigured network: "${hre.network.name}"`)
}


type DeployFunction = (
  deployName: string,
  contractName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args?: string[] | any[]
) => Promise<DeployResult>;
type Deployments = { [key: string]: DeployResult };


async function deployImpl(deploy: DeployFunction, contracts: ContractList) {
  const results: Deployments = {};
  for (const i of contracts) {
    const key = typeof i !== 'string' ? Object.keys(i)[0] : i;
    const n = `Impl${key}`;
    results[n] = await deploy(n, key);
  }
  return results;
}

async function deployUpBeacon(
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

async function deployBeaconProxy(
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

async function deployContracts(deploy: DeployFunction) {
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
      DEPLOY_CONFIG.networkId,
      DEPLOY_CONFIG.networkName,
      DEPLOY_CONFIG.bnplTokenAddress,
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

async function getDeployedContracts(
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

async function initializeBankNodeManager(
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
    deployer.address,
    DEPLOY_CONFIG.minBondingAmount,
    beaconProxyDeployments.BankNodeLendingRewardsProxy.address,
    beaconProxyDeployments.BNPLKYCStoreProxy.address
  ));
  console.log('BankNodeManager >> DONE')
}

async function initializeBankNodeLendingRewards(
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
    DEPLOY_CONFIG.defaultRewardDuration,
    await BNPLProtocolConfig.bnplToken(),
    BankNodeManager.address,
    deployer.address,
    deployer.address
  ));
  console.log('BankNodeLendingRewards >> DONE')
}

async function options(BankNodeManager: BankNodeManager) {
  console.log('\n>>>>>>>>> Add lendable tokens...\n');
  let num = 0
  for (const lendableToken of DEPLOY_CONFIG.lendableTokens) {
    console.log(` - (${++num}/${DEPLOY_CONFIG.lendableTokens.length}) Adding lendable token "${lendableToken.symbol}" ("${lendableToken.tokenContract}")...`)
    await waitContractCall(await BankNodeManager.addLendableToken(lendableToken, lendableToken.enabled ? 1 : 0));
  }
  console.log('lendable tokens >> DONE')

}

async function initializeContracts(
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
  await options(BankNodeManager);
}

async function main() {
  const { deployer, deploy } = await setup();
  const deployments = await deployContracts(deploy);
  const deployedContracts = await getDeployedContracts(deployer);
  await initializeContracts(deployments, deployedContracts, deployer);
  console.log('>>> CONTRACTS SETUP DONE <<<');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
