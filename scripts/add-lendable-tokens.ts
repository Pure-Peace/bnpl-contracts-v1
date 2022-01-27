import { BankNodeManager } from '../typechain';
import { addLendableTokens, getContractFromEnvOrPrompts, setup } from './utils'

async function main() {
  const { deployer } = await setup();
  await addLendableTokens(await getContractFromEnvOrPrompts<BankNodeManager>({ contractNameEnv: 'BankNodeManager' }, deployer));
}



main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
