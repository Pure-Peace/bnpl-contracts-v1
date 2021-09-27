// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../Management/IBankNodeManager.sol";


interface IBNPLProtocolConfig {


    function upBeaconBankNodeManager() external view returns (UpgradeableBeacon);

    function upBeaconBankNode() external view returns (UpgradeableBeacon);
    function upBeaconBankNodeLendingPoolToken() external view returns (UpgradeableBeacon);

    function upBeaconBankNodeStakingPool() external view returns (UpgradeableBeacon);
    function upBeaconBankNodeStakingPoolToken() external view returns (UpgradeableBeacon);


    function bankNodeManager() external view returns (IBankNodeManager);

    function bnplToken() external view returns (IERC20);



}