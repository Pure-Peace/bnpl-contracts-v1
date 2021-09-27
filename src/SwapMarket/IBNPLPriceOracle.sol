// contracts/IBNPLPriceOracle.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBNPLPriceOracle {
    function bnplPrices(address token) external returns (uint256);
}
