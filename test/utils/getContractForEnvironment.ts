import { Signer, Contract } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
type THardHatLookupHelper<T> = (hre: HardhatRuntimeEnvironment, contractSlug: string, signer?: string | Signer | undefined) => Promise<T>;
function generateEnvNameContractDefHelper(networkToContract: { [networkName: string]: string }, { abiName, lookupName }: { abiName?: string, lookupName?: string } = {}): THardHatLookupHelper<any> {


  return async (hre: HardhatRuntimeEnvironment, contractSlug: string, signer?: string | Signer | undefined) => {
    const addressOrAbi = (Object.prototype.hasOwnProperty.call(networkToContract, hre.network.name) && networkToContract[hre.network.name]) ? networkToContract[hre.network.name] : null;
    const contractAddressOverride = (addressOrAbi && addressOrAbi.substring(0, 2) === "0x") ? addressOrAbi : null;
    const contractAbiName = contractAddressOverride ? (abiName || contractSlug) : (contractAddressOverride || abiName || contractSlug);

    if (contractAddressOverride) {
      return hre.ethers.getContractAt((lookupName || contractAbiName), contractAddressOverride, signer);
    } else {
      if (abiName && lookupName && lookupName !== abiName) {
        const realContract = await hre.ethers.getContract(lookupName);
        return hre.ethers.getContractAt(contractAbiName, realContract.address, signer);
      } else {

        return hre.ethers.getContract(contractAbiName, signer);
      }
    }
  }

}
const DEF_GET_CONTRACT_FOR_ENVIRONMENT = {
  "BNPLToken": generateEnvNameContractDefHelper({
    "mainnet": "0x84d821f7fbdd595c4c4a50842913e6b1e07d7a53",
    "hardhat": "BNPLToken",
  }),
  "BankNodeManager": generateEnvNameContractDefHelper({

  }, { lookupName: "BankNodeManagerProxy", abiName: "BankNodeManager" }),
}
type TContractSlug = keyof typeof DEF_GET_CONTRACT_FOR_ENVIRONMENT;

async function getContractForEnvironment<T>(hre: HardhatRuntimeEnvironment, contractSlug: TContractSlug, signer?: string | Signer | undefined): Promise<T> {
  return DEF_GET_CONTRACT_FOR_ENVIRONMENT[contractSlug](hre, contractSlug, signer);
}

export {
  getContractForEnvironment,
}
