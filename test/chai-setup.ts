/*import chaiModule from 'chai';
import { chaiEthers } from 'chai-ethers';
import chaiAsPromised from 'chai-as-promised'
chaiModule.use(chaiAsPromised);
chaiModule.use(chaiEthers);
export = chaiModule;
*/

import chaiModule from 'chai';

import chaiAsPromised from 'chai-as-promised'

const goodChai = chaiModule.use(chaiAsPromised);


export = goodChai;
