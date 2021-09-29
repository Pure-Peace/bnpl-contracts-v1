// contracts/ScrollToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../Utils/TransferHelper.sol";
import "./IBNPLSwapMarket.sol";
import "./IBNPLPriceOracle.sol";

contract BNPLSwapMarketExample is IBNPLSwapMarket, IBNPLPriceOracle, AccessControl {
    bytes32 public constant PRICE_SETTER_ROLE = keccak256("PRICE_SETTER_ROLE");
    bytes32 public constant WITHDRAWAL_ROLE = keccak256("WITHDRAWAL_ROLE");

    mapping(address => uint256) public tokenBalances;
    mapping(address => uint256) public override bnplPrices;

    uint256 public bnplBalance;

    address public BNPL_TOKEN_ADDRESS;

    constructor(address bnplTokenAddress) {
        BNPL_TOKEN_ADDRESS = bnplTokenAddress;
        _setupRole(PRICE_SETTER_ROLE, msg.sender);
        _setupRole(WITHDRAWAL_ROLE, msg.sender);
    }

    function setBNPLPrice(address token, uint256 bnplPrice) public onlyRole(PRICE_SETTER_ROLE) {
        require(token != BNPL_TOKEN_ADDRESS);
        bnplPrices[token] = bnplPrice;
    }

    function withdrawToken(address token, uint256 amount) public onlyRole(WITHDRAWAL_ROLE) {
        require(amount != 0);
        require(token != BNPL_TOKEN_ADDRESS);
        require(tokenBalances[token] != 0 && tokenBalances[token] >= amount);
        tokenBalances[token] -= amount;
        TransferHelper.safeTransfer(token, msg.sender, amount);
    }

    function withdrawBNPL(uint256 amount) public onlyRole(WITHDRAWAL_ROLE) {
        require(amount != 0);
        require(bnplBalance != 0 && bnplBalance >= amount);
        bnplBalance -= amount;
        TransferHelper.safeTransfer(BNPL_TOKEN_ADDRESS, msg.sender, amount);
    }

    function depositToken(address token, uint256 amount) public {
        require(amount != 0);
        require(token != BNPL_TOKEN_ADDRESS);
        TransferHelper.safeTransferFrom(token, msg.sender, address(this), amount);
        tokenBalances[token] += amount;
    }

    function depositBNPL(uint256 amount) public {
        require(amount != 0);
        TransferHelper.safeTransferFrom(BNPL_TOKEN_ADDRESS, msg.sender, address(this), amount);
        bnplBalance += amount;
    }

    function _swapTokenForBNPL(
        address inputTokenAddress,
        uint256 inputTokenAmount,
        address recipient
    ) private returns (uint256 amountOut) {
        require(inputTokenAddress != BNPL_TOKEN_ADDRESS);
        require(bnplPrices[inputTokenAddress] != 0, "token not supported");
        require(inputTokenAmount != 0, "inputTokenAmount cannot be 0");
        uint256 actualAmountOut = inputTokenAmount / bnplPrices[inputTokenAddress];
        uint256 actualAmountIn = actualAmountOut * bnplPrices[inputTokenAddress];
        require(actualAmountIn <= inputTokenAmount && actualAmountIn != 0, "actualAmountIn cannot be 0");
        require(actualAmountOut != 0, "actualAmountOut cannot be 0");
        require(bnplBalance >= actualAmountOut, "not enough bnpl");
        bnplBalance -= actualAmountOut;

        TransferHelper.safeTransferFrom(inputTokenAddress, msg.sender, address(this), actualAmountIn);
        tokenBalances[inputTokenAddress] += actualAmountIn;

        TransferHelper.safeTransfer(BNPL_TOKEN_ADDRESS, recipient, actualAmountOut);
        amountOut = actualAmountOut;
    }

    function _swapBNPLForToken(
        address outputTokenAddress,
        uint256 bnplAmount,
        address recipient
    ) private returns (uint256 amountOut) {
        require(outputTokenAddress != BNPL_TOKEN_ADDRESS);
        require(bnplPrices[outputTokenAddress] != 0, "token not supported");
        require(bnplAmount != 0, "bnplAmount cannot be 0");
        uint256 actualAmountOut = bnplPrices[outputTokenAddress] * bnplAmount;
        require(actualAmountOut != 0, "actualAmountOut cannot be 0");
        require(tokenBalances[outputTokenAddress] >= actualAmountOut, "not enough output token");
        tokenBalances[outputTokenAddress] -= actualAmountOut;

        TransferHelper.safeTransferFrom(BNPL_TOKEN_ADDRESS, msg.sender, address(this), bnplAmount);
        bnplBalance += bnplAmount;
        TransferHelper.safeTransfer(outputTokenAddress, recipient, actualAmountOut);
        amountOut = actualAmountOut;
    }

    function exactInputSingle(IBNPLSwapMarket.ExactInputSingleParams calldata params)
        external
        payable
        override
        returns (uint256 amountOut)
    {
        require(block.timestamp <= params.deadline, "Transaction too old");
        if (params.tokenIn == BNPL_TOKEN_ADDRESS) {
            amountOut = _swapBNPLForToken(params.tokenOut, params.amountIn, params.recipient);
        } else {
            require(params.tokenOut == BNPL_TOKEN_ADDRESS, "only supports swaps with BNPL token involved!");
            amountOut = _swapTokenForBNPL(params.tokenIn, params.amountIn, params.recipient);
        }
        require(amountOut >= params.amountOutMinimum, "Too little received");
    }
}
