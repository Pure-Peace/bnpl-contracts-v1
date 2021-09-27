// contracts/BNPLProtocolConfig.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


import "./IBNPLProtocolConfig.sol";

contract BNPLProtocolConfig is IBNPLProtocolConfig {
    IERC20 public override bnplToken;
    
    UpgradeableBeacon public override upBeaconBankNodeManager;

    UpgradeableBeacon public override upBeaconBankNode;
    UpgradeableBeacon public override upBeaconBankNodeLendingPoolToken;

    UpgradeableBeacon public override upBeaconBankNodeStakingPool;
    UpgradeableBeacon public override upBeaconBankNodeStakingPoolToken;

    IBankNodeManager public override bankNodeManager;


    constructor(
        IERC20 _bnplToken,

        UpgradeableBeacon _upBeaconBankNodeManager,

        UpgradeableBeacon _upBeaconBankNode,
        UpgradeableBeacon _upBeaconBankNodeLendingPoolToken,

        UpgradeableBeacon _upBeaconBankNodeStakingPool,
        UpgradeableBeacon _upBeaconBankNodeStakingPoolToken,

        IBankNodeManager _bankNodeManager
    )
    {
        bnplToken = _bnplToken;

        upBeaconBankNodeManager = _upBeaconBankNodeManager;

        upBeaconBankNode = _upBeaconBankNode;
        upBeaconBankNodeLendingPoolToken = _upBeaconBankNodeLendingPoolToken;

        upBeaconBankNodeStakingPool = _upBeaconBankNodeStakingPool;
        upBeaconBankNodeStakingPoolToken = _upBeaconBankNodeStakingPoolToken;

        bankNodeManager = _bankNodeManager;
    }
}