// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "./IGenericMintableTo.sol";

/**
 * @dev Interface of the IMintableTokenUpgradeable standard 
 */
interface IMintableTokenUpgradeable is IGenericMintableTo, IERC20Upgradeable {
}
