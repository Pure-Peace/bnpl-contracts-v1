#!/usr/bin/env node
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import hre from 'hardhat';
import { DeployResult } from 'hardhat-deploy/types';
import { getContractForEnvironment } from '../test/utils/getContractForEnvironment';

import {
  BankNodeLendingRewards,
  BankNodeManager,
  BNPLKYCStore,
  BNPLProtocolConfig,
  IERC20
} from '../typechain';

require('dotenv').config();

const { deployments } = hre;
const { deploy: _dep } = deployments;

const GAS_LIMIT = 5500000;

async function setup() {
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

type DeployFunction = (
  deployName: string,
  contractName: string,
  args?: string[] | any[]
) => Promise<DeployResult>;
type ContractList = (string | { [key: string]: string[] })[];
type Deployments = { [key: string]: DeployResult };

const IMPL_PREFIX = 'Impl';
const UPBEACON_PREFIX = 'UpBeacon';

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

const UPGRADEABLE_CONTRACTS: ContractList = [
  'BankNodeManager',
  'BankNodeLendingRewards',
  'BNPLBankNode',
  'BNPLStakingPool',
  'BNPLKYCStore',
  {
    PoolTokenUpgradeable: [
      'BankNodeLendingPoolToken',
      'BankNodeStakingPoolToken'
    ]
  }
];

const PROXY_CONTRACTS: ContractList = [
  'BankNodeManager',
  'BankNodeLendingRewards',
  'BNPLKYCStore'
];

const BNPL_TOKEN_ADDRESS = '0x0c6ec7437657cb501ae35718e5426815e83e9e00';
const MIN_BONDING_AMOUNT = '100000000000000000000000';

const TUSD_KOVAN = '0x016750AC630F711882812f24Dba6c95b9D35856d';
const A_TUSD_KOVAN = '0x39914AdBe5fDbC2b9ADeedE8Bcd444b20B039204';
const TUSD_TOKEN_DECIMALS = 18;
const SUSHISWAP_KOVAN = '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506';

const LENDABLETOKEN_TUSD_KOVAN = {
  tokenContract: TUSD_KOVAN,
  swapMarket: SUSHISWAP_KOVAN,
  swapMarketPoolFee: 3000,
  decimals: TUSD_TOKEN_DECIMALS,
  valueMultiplier: '1000000000000000000',
  unusedFundsLendingMode: 1,
  unusedFundsLendingContract: '0xE0fBa4Fc209b4948668006B2bE61711b7f465bAe',
  unusedFundsLendingToken: A_TUSD_KOVAN,
  symbol: 'TUSD',
  poolSymbol: 'pTUSD'
};

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
      hre.network.live ? '1' : '13371337',
      hre.network.live ? 'BNPL MAINNET' : 'BNPL TESTING',
      BNPL_TOKEN_ADDRESS,
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
  deploy: DeployFunction,
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
    (await BankNodeManager.bnplToken()) !==
    '0x0000000000000000000000000000000000000000'
  ) {
    console.log('\nBankNodeManager is already initialized!');
    return;
  }
  await BankNodeManager.initialize(
    BNPLProtocolConfig.address,
    deployer.address,
    MIN_BONDING_AMOUNT,
    beaconProxyDeployments.BankNodeLendingRewardsProxy.address,
    beaconProxyDeployments.BNPLKYCStoreProxy.address
  );
}

async function initializeBankNodeLendingRewards(
  BankNodeLendingRewards: BankNodeLendingRewards,
  BNPLProtocolConfig: BNPLProtocolConfig,
  deployer: SignerWithAddress
) {
  console.log('\n>>>>>>>>> Initializing BankNodeLendingRewards...\n');
  if (
    (await BankNodeLendingRewards.bankNodeManager()) !==
    '0x0000000000000000000000000000000000000000'
  ) {
    console.log('\nBankNodeLendingRewards is already initialized!');
    return;
  }
  await BankNodeLendingRewards.initialize(
    60 * 60 * 24 * 7,
    await BNPLProtocolConfig.bnplToken(),
    '0x177A5CA78b5f97F0ca8D0f3EEDfe971F794b2419',
    deployer.address,
    deployer.address
  );
}

async function options(BankNodeManager: BankNodeManager) {
  console.log('\n>>>>>>>>> Add lendable tokens...\n');
  await BankNodeManager.addLendableToken(LENDABLETOKEN_TUSD_KOVAN, 1);
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
    BankNodeLendingRewards,
    BNPLProtocolConfig,
    deployer
  );
  await options(BankNodeManager);
}

async function main() {
  const { deployer, deploy } = await setup();
  const deployments = await deployContracts(deploy);
  const deployedContracts = await getDeployedContracts(deploy, deployer);
  await initializeContracts(deployments, deployedContracts, deployer);
  console.log('>>> CONTRACTS SETUP DONE <<<');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
