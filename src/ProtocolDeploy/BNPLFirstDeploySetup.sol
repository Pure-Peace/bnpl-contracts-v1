// contracts/PoolTokenUpgradable.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../Management/BankNodeManager.sol";
import "./BNPLProtocolConfig.sol";


contract BNPLFirstDeploySetup is Initializable {
    struct IDeployWithImplementationsParams {
        IERC20 bnplToken;
        address implBankNodeManager;
        address implBankNode;
        address implBankNodeLendingPoolToken;
        address implBankNodeStakingPool;
        address implBankNodeStakingPoolToken;
        address configurator;
        uint256 minimumBankNodeBondedAmount;
    }
    
    function deployBNPLWithImplementations(
        IDeployWithImplementationsParams calldata params
    ) public returns (BNPLProtocolConfig) {

        UpgradeableBeacon upBeaconBankNodeManager = new UpgradeableBeacon(params.implBankNodeManager);
        BankNodeManager bankNodeManager = BankNodeManager(address(new BeaconProxy(address(upBeaconBankNodeManager),"")));
        BNPLProtocolConfig protocolConfig = new BNPLProtocolConfig(
            params.bnplToken,

            upBeaconBankNodeManager,

            new UpgradeableBeacon(params.implBankNode),
            new UpgradeableBeacon(params.implBankNodeLendingPoolToken),

            new UpgradeableBeacon(params.implBankNodeStakingPool),
            new UpgradeableBeacon(params.implBankNodeStakingPoolToken),

            bankNodeManager
        );

        bankNodeManager.initialize(protocolConfig, params.configurator, params.minimumBankNodeBondedAmount);


        return protocolConfig;
    }
    
}