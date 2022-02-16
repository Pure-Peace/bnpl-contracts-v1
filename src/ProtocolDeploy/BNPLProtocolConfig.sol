// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {UpgradeableBeacon} from "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";

import {IBankNodeManager} from "../Management/interfaces/IBankNodeManager.sol";
import {IBNPLProtocolConfig} from "./interfaces/IBNPLProtocolConfig.sol";

/// @title BNPL Protocol configuration contract
///
/// @notice
/// - Include:
///     **Network Info**
///     **BNPL token contracts**
///     **BNPL UpBeacon contracts**
///     **BNPL BankNodeManager contract**
///
/// @author BNPL
contract BNPLProtocolConfig is IBNPLProtocolConfig {
    /// @notice Blockchain network id
    uint64 public override networkId;

    /// @notice Blockchain network name
    string public override networkName;

    /// @notice BNPL token address
    IERC20 public override bnplToken;

    /// @notice Bank node manager upBeacon contract
    UpgradeableBeacon public override upBeaconBankNodeManager;

    /// @notice Bank node upBeacon contract
    UpgradeableBeacon public override upBeaconBankNode;

    /// @notice Bank node lending pool token upBeacon contract
    UpgradeableBeacon public override upBeaconBankNodeLendingPoolToken;

    /// @notice Bank node staking pool upBeacon contract
    UpgradeableBeacon public override upBeaconBankNodeStakingPool;

    /// @notice Bank node staking pool token upBeacon contract
    UpgradeableBeacon public override upBeaconBankNodeStakingPoolToken;

    /// @notice Bank node lending rewards upBeacon contract
    UpgradeableBeacon public override upBeaconBankNodeLendingRewards;

    /// @notice BNPL KYC store upBeacon contract
    UpgradeableBeacon public override upBeaconBNPLKYCStore;

    /// @notice BankNodeManager contract
    IBankNodeManager public override bankNodeManager;

    constructor(
        uint64 _networkId,
        string memory _networkName,
        IERC20 _bnplToken,
        UpgradeableBeacon _upBeaconBankNodeManager,
        UpgradeableBeacon _upBeaconBankNode,
        UpgradeableBeacon _upBeaconBankNodeLendingPoolToken,
        UpgradeableBeacon _upBeaconBankNodeStakingPool,
        UpgradeableBeacon _upBeaconBankNodeStakingPoolToken,
        UpgradeableBeacon _upBeaconBankNodeLendingRewards,
        UpgradeableBeacon _upBeaconBNPLKYCStore,
        IBankNodeManager _bankNodeManager
    ) {
        networkId = _networkId;
        networkName = _networkName;

        bnplToken = _bnplToken;

        upBeaconBankNodeManager = _upBeaconBankNodeManager;

        upBeaconBankNode = _upBeaconBankNode;
        upBeaconBankNodeLendingPoolToken = _upBeaconBankNodeLendingPoolToken;

        upBeaconBankNodeStakingPool = _upBeaconBankNodeStakingPool;
        upBeaconBankNodeStakingPoolToken = _upBeaconBankNodeStakingPoolToken;

        upBeaconBankNodeLendingRewards = _upBeaconBankNodeLendingRewards;
        upBeaconBNPLKYCStore = _upBeaconBNPLKYCStore;

        bankNodeManager = _bankNodeManager;
    }
}
