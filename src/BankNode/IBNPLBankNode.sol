// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @dev Interface of the IBNPLBankNode standard 
 */
interface IBankNodeInitializableV1 {
    struct BankNodeInitializeArgsV1 {
        uint32 bankNodeId;
        uint24 bnplSwapMarketPoolFee;

        address bankNodeManager;
        address operatorAdmin;
        address operator;
        address bnplToken;
        address bnplSwapMarket;
        
        uint16 unusedFundsLendingMode;
        address unusedFundsLendingContract;
        address unusedFundsLendingToken;
        
        address nodeStakingPool;
        address baseLiquidityToken;
        address poolLiquidityToken;
    }
    function initialize(BankNodeInitializeArgsV1 calldata bankNodeInitConfig) external;
}

/**
 * @dev Interface of the IBNPLBankNode standard 
 */
interface IBNPLBankNode is IBankNodeInitializableV1 {
    function donate(uint256 depositAmount) external;
    function addLiquidity(uint256 depositAmount) external;
    function removeLiquidity(uint256 withdrawAmount) external;
    function requestLoan(uint256 loanAmount, uint64 totalLoanDuration, uint32 numberOfPayments, uint256 amountPerPayment, uint8 messageType, string memory message) external;
    
    function denyLoanRequest(uint256 loanRequestId) external;
    function approveLoanRequest(uint256 loanRequestId) external;
    function makeLoanPayment(uint256 loanId) external;
    function reportOverdueLoan(uint256 loanId) external;
}
