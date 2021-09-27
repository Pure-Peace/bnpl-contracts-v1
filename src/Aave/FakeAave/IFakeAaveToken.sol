// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
/**
 * @dev Interface of the ScrollToken standard 
 */
interface IFakeAaveToken is IERC20 {
    function internalAaveMintFor(address to, uint256 amount) external;
    function internalAaveBurnFor(address to, uint256 amount) external;
}
