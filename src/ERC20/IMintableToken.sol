// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IGenericMintableTo.sol";

/**
 * @dev Interface of the IMintableToken standard 
 */
interface IMintableToken is IGenericMintableTo, IERC20 {
}
