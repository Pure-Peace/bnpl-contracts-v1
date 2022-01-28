// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

import {IMintableToken} from "../../ERC20/interfaces/IMintableToken.sol";
import {IFakeAaveToken} from "../interfaces/IFakeAaveToken.sol";

contract FakeAaveUSDToken is ERC20, AccessControl, ERC20Burnable, IMintableToken, IFakeAaveToken {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant MINTER_ADMIN_ROLE = keccak256("MINTER_ADMIN_ROLE");
    uint8 private _decimals;

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_
    ) ERC20(name_, symbol_) {
        _decimals = decimals_;
        _setupRole(MINTER_ADMIN_ROLE, msg.sender);
        _setRoleAdmin(MINTER_ROLE, MINTER_ADMIN_ROLE);
    }

    function internalAaveMintFor(address to, uint256 amount) external override {
        _mint(to, amount);
    }

    function internalAaveBurnFor(address to, uint256 amount) external override {
        _burn(to, amount);
    }

    function mint(address to, uint256 amount) external override onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }
}
