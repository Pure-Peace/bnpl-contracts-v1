import { Signer, Contract } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { genGetContractWith } from "./genHelpers";
type THardHatLookupHelper<T> = (hre: HardhatRuntimeEnvironment, contractSlug: string, signer?: string | Signer | undefined) => Promise<T>;
function generateEnvNameContractDefHelper(networkToContract: { [networkName: string]: string }, { abiName, lookupName }: { abiName?: string, lookupName?: string } = {}): THardHatLookupHelper<any> {


  return async (hre: HardhatRuntimeEnvironment, contractSlug: string, signer?: string | Signer | undefined) => {
    const { getContract, getContractAt } = genGetContractWith(hre);
    const addressOrAbi = (Object.prototype.hasOwnProperty.call(networkToContract, hre.network.name) && networkToContract[hre.network.name]) ? networkToContract[hre.network.name] : null;
    const contractAddressOverride = (addressOrAbi && addressOrAbi.substring(0, 2) === "0x") ? addressOrAbi : null;
    const contractAbiName = contractAddressOverride ? (abiName || contractSlug) : (contractAddressOverride || abiName || contractSlug);
    if (contractAddressOverride) {
      return getContractAt((lookupName || contractAbiName), contractAddressOverride, signer);
    } else {
      if (abiName && lookupName && lookupName !== abiName) {
        const realContract = await getContract(lookupName);
        return getContractAt(contractAbiName, realContract.address, signer);
      } else {

        return getContract(contractAbiName, signer);
      }
    }
  }

}
const DEF_GET_CONTRACT_FOR_ENVIRONMENT = {
  "BNPLToken": generateEnvNameContractDefHelper({
    "mainnet": "0x84d821f7fbdd595c4c4a50842913e6b1e07d7a53",
    "ropsten": "BNPLToken",
    "hardhat": "BNPLToken",
  }),

  "BNPLProtocolConfig": generateEnvNameContractDefHelper({}),

  "BankNodeManager": generateEnvNameContractDefHelper(
    {},
    { lookupName: "BankNodeManagerProxy", abiName: "BankNodeManager" }
  ),

  "BankNodeLendingRewards": generateEnvNameContractDefHelper(
    {},
    { lookupName: "BankNodeLendingRewardsProxy", abiName: "BankNodeLendingRewards" }
  ),

  "AaveLendingPool": generateEnvNameContractDefHelper(
    {
      "hardhat": "FakeAaveLendingPool",
      "kovan": "0xE0fBa4Fc209b4948668006B2bE61711b7f465bAe",
      "mainnet": "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9",
    }, { abiName: "FakeAaveLendingPool" }
  ),
  "UniswapV3Router": generateEnvNameContractDefHelper(
    {
      "hardhat": "BNPLSwapMarketExample",
      "kovan": "BNPLSwapMarketExample",
      //"kovan": "0xE592427A0AEce92De3Edee1F18E0157C05861564",
      "mainnet": "0xE592427A0AEce92De3Edee1F18E0157C05861564",

    }, { abiName: "BNPLSwapMarketExample" }
  ),

  "DAI": generateEnvNameContractDefHelper(
    {
      "hardhat": "DAI",
      "mainnet": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      "kovan": "0xFf795577d9AC8bD7D90Ee22b6C1703490b6512FD",
      //"ropsten": "0xf80A32A835F79D7787E8a8ee5721D0fEaFd78108",
    }
  ),
  "USDT": generateEnvNameContractDefHelper(
    {
      "hardhat": "USDT",
      "mainnet": "0xdac17f958d2ee523a2206206994597c13d831ec7",
      "kovan": "0x13512979ADE267AB5100878E2e0f485B568328a4",
      //"ropsten": "0xB404c51BBC10dcBE948077F18a4B8E553D160084",
    }
  ),
  "USDC": generateEnvNameContractDefHelper(
    {
      "hardhat": "USDC",
      "mainnet": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "kovan": "0xe22da380ee6B445bb8273C81944ADEB6E8450422",
      //"ropsten": "0x851dEf71f0e6A903375C1e536Bd9ff1684BAD802",
    }
  ),
  "aDAI": generateEnvNameContractDefHelper(
    {
      "hardhat": "aDAI",
      "mainnet": "0xfC1E690f61EFd961294b3e1Ce3313fBD8aa4f85d",
      "kovan": "0x58AD4cB396411B691A9AAb6F74545b2C5217FE6a",
      //"ropsten": "0xcB1Fe6F440c49E9290c3eb7f158534c2dC374201",
    }
  ),
  "aUSDT": generateEnvNameContractDefHelper(
    {
      "hardhat": "aUSDT",
      "mainnet": "0x71fc860F7D3A592A4a98740e39dB31d25db65ae8",
      "kovan": "0xA01bA9fB493b851F4Ac5093A324CB081A909C34B",
      //"ropsten": "0x790744bC4257B4a0519a3C5649Ac1d16DDaFAE0D",
    }
  ),
  "aUSDC": generateEnvNameContractDefHelper(
    {
      "hardhat": "aUSDC",
      "mainnet": "0x9bA00D6856a4eDF4665BcA2C2309936572473B7E",
      "kovan": "0x02F626c6ccb6D2ebC071c068DC1f02Bf5693416a",
      //"ropsten": "0x2dB6a31f973Ec26F5e17895f0741BB5965d5Ae15",
    }
  ),

}
type TContractSlug = keyof typeof DEF_GET_CONTRACT_FOR_ENVIRONMENT;

async function getContractForEnvironment<T>(hre: HardhatRuntimeEnvironment, contractSlug: TContractSlug, signer?: string | Signer | undefined): Promise<T> {
  return DEF_GET_CONTRACT_FOR_ENVIRONMENT[contractSlug](hre, contractSlug, signer);
}
export type {
  TContractSlug,
}
export {
  getContractForEnvironment,
}
