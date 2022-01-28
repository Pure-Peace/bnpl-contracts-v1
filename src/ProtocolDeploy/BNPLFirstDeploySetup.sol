// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {UpgradeableBeacon} from "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {BeaconProxy} from "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";

import {BankNodeManager} from "../Management/BankNodeManager.sol";
import {BNPLKYCStore} from "../Management/BNPLKYCStore.sol";

import {BNPLProtocolConfig} from "./BNPLProtocolConfig.sol";
import {BankNodeLendingRewards} from "../Rewards/PlatformRewards/BankNodeLendingRewards.sol";

contract BNPLFirstDeploySetup is Initializable {
    struct IDeployWithImplementationsParams {
        IERC20 bnplToken;
        address implBankNodeManager;
        address implBankNode;
        address implBankNodeLendingPoolToken;
        address implBankNodeStakingPool;
        address implBankNodeStakingPoolToken;
        address implBankNodeLendingRewards;
        address configurator;
        uint256 minimumBankNodeBondedAmount;
        uint256 loanOverdueGracePeriod;
    }

    function deployBNPLWithImplementations(IDeployWithImplementationsParams calldata params)
        external
        returns (BNPLProtocolConfig)
    {
        UpgradeableBeacon upBeaconBankNodeManager = new UpgradeableBeacon(params.implBankNodeManager);
        UpgradeableBeacon upBeaconBankNodeLendingRewards = new UpgradeableBeacon(params.implBankNodeLendingRewards);
        BankNodeManager bankNodeManager = BankNodeManager(
            address(new BeaconProxy(address(upBeaconBankNodeManager), ""))
        );

        BNPLProtocolConfig protocolConfig = new BNPLProtocolConfig(
            1337,
            "Test Net",
            params.bnplToken,
            upBeaconBankNodeManager,
            new UpgradeableBeacon(params.implBankNode),
            new UpgradeableBeacon(params.implBankNodeLendingPoolToken),
            new UpgradeableBeacon(params.implBankNodeStakingPool),
            new UpgradeableBeacon(params.implBankNodeStakingPoolToken),
            upBeaconBankNodeLendingRewards,
            UpgradeableBeacon(address(0)),
            bankNodeManager
        );

        BankNodeLendingRewards bankNodeLendingRewards = BankNodeLendingRewards(
            address(new BeaconProxy(address(upBeaconBankNodeLendingRewards), ""))
        );
        bankNodeManager.initialize(
            protocolConfig,
            params.configurator,
            params.minimumBankNodeBondedAmount,
            params.loanOverdueGracePeriod,
            bankNodeLendingRewards,
            BNPLKYCStore(address(0))
        );

        return protocolConfig;
    }
}
