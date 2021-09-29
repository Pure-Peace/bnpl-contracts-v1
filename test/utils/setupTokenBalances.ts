import { ContractTransaction, BigNumberish } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { IERC20 } from "../../typechain";
import { getContractForEnvironment, TContractSlug } from "./getContractForEnvironment";

type TTokenDistributor = (hre: HardhatRuntimeEnvironment, toActor: string, amount: string | number | BigNumberish) => Promise<ContractTransaction>;


function genForTokenTransferBasic(contractName: TContractSlug, fromActor: string): TTokenDistributor {
  return async (hre: HardhatRuntimeEnvironment, toActor: string, amount: string | number | BigNumberish) => {

    const namedAccounts = await hre.getNamedAccounts();
    if (!(fromActor in namedAccounts)) {
      throw new Error("genForTokenTransferBasic: Could not find token sending actor: " + fromActor);
    }
    if (!(toActor in namedAccounts)) {
      throw new Error("genForTokenTransferBasic: Could not find token recipient actor: " + toActor);
    }


    const token = await getContractForEnvironment<IERC20>(hre, contractName, namedAccounts[fromActor]);
    return token.transfer(namedAccounts[toActor], amount);







  }
}
const TOKENS = {
  "BNPLToken": genForTokenTransferBasic("BNPLToken", "bnplTokenDeployer"),
  "DAI": genForTokenTransferBasic("DAI", "protocolDeployer"),
  "USDT": genForTokenTransferBasic("USDT", "protocolDeployer"),
  "USDC": genForTokenTransferBasic("USDC", "protocolDeployer"),
}
type RealToken = keyof typeof TOKENS
async function setupBalanceForActor(hre: HardhatRuntimeEnvironment, token: RealToken, toActor: string, amount: string | number | BigNumberish): Promise<ContractTransaction> {

  return TOKENS[token](hre, toActor, amount);

}

async function setupTokenBalancesConfig(hre: HardhatRuntimeEnvironment, config: { [toActor: string]: { [z in RealToken]?: string | number | BigNumberish } }): Promise<any> {
  for (const toActor of Object.keys(config)) {
    for (const c of Object.keys(config[toActor])) {
      const v = config[toActor][c as RealToken];
      if (v) {
        await setupBalanceForActor(hre, c as RealToken, toActor, v);
      }
    }
  }
}

export {
  setupTokenBalancesConfig,
}
