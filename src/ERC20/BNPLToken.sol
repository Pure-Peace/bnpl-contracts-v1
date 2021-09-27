// contracts/ScrollToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract BNPLToken is ERC20, AccessControl {
    constructor() ERC20("BNPL", "BNPL") {
        _mint(msg.sender, 100000000 * (10**18));
    }
}
