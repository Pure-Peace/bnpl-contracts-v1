// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @dev Interface of the IBankNodeStakingPoolInitializableV1 standard 
 */
interface IBankNodeStakingPoolInitializableV1 {
    function initialize(address bnplToken, address poolBNPLToken, address slasherAdmin) external;
}

/**
 * @dev Interface of the IBankNode standard 
 */
interface IBNPLNodeStakingPool is IBankNodeStakingPoolInitializableV1{
    function donate(uint256 donateAmount) external;
    function stakeTokens(uint256 stakeAmount) external;
    function unstakeTokens(uint256 unstakeAmount) external;
    function slash(uint256 slashAmount) external;
    function getPoolTotalAssetsValue() external view returns (uint256);
}
