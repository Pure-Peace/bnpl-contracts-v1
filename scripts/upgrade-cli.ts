/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-var-requires */
import hre from 'hardhat';

import { getContractForEnvironment } from '../test/utils/getContractForEnvironment';
import { UPBEACON_PREFIX, UPGRADEABLE_CONTRACTS } from './constants'
import { setup } from './utils'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers, Signer } from 'ethers';
import fs from 'fs'
import path from 'path'

const prompts = require('prompts')

async function tryGetContractForEnvironment<T extends ethers.Contract>(contractName: string, deployer: SignerWithAddress) {
  const result: { err: any, contract: any } = {
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
    result.contract = await hre.ethers.getContractAt(deployment.abi, deployment.address, deployer)
    return result
  } catch (err2) {
    result.err = err2
  }
  return result
}

async function getContractAt<T extends ethers.Contract>(contractName: string, address: string, signer?: string | Signer | undefined) {
  const realSigner = (typeof signer === 'string' ? (await hre.ethers.getSigner(signer)) : signer);
  try {
    const contract = await hre.deployments.get(contractName);
    return hre.ethers.getContractAt(contract.abi, address, realSigner) as Promise<T>;
  } catch (err) {
    return hre.ethers.getContractAt(contractName, address, realSigner) as Promise<T>;
  }
}

async function main() {
  const { deploy, deployer } = await setup()
  const { contracts } = await prompts([
    {
      type: 'multiselect',
      name: 'contracts',
      message: 'Select the contract to be upgraded:',
      choices: UPGRADEABLE_CONTRACTS.reduce((pre, cur) => {
        if (typeof cur === 'string') pre.push(cur)
        else pre.push(...cur[Object.keys(cur)[0]])
        return pre
      }, [] as any).map((i: string) => { return { title: i, value: i } }),
    }
  ]);

  console.log('Upgrade the following contracts:', contracts);
  for (const i of contracts) {
    const name = `${UPBEACON_PREFIX}${i}`
    console.log(`\nGetting contract "${name}"...`)
    let { contract, err } = await tryGetContractForEnvironment(name, deployer)
    if (!contract) {
      const { contractAddress } = await prompts({
        type: 'text',
        name: 'contractAddress',
        message: 'Unable to find the contract from the environment, please enter the address manually:'
      })
      contract = await getContractAt('UpgradeableBeacon', contractAddress, deployer)
    }
    const owner = await contract.owner()
    if (owner != deployer.address) {
      throw new Error('You do not have permission to use the upgrade contract')
    }
    console.log(`Successfully get upgrade contract at "${contract.address}"`)
    console.log('Deploying a new implementation...')
    const depResult = await deploy(`Impl${i}`, i);
    console.log('Upgrading contract...')
    await contract.upgradeTo(depResult.address)
    console.log(`Successfully upgrade contract "${i}"`)
  }

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
