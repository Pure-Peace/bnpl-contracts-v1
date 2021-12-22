// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../ERC20/IMintableBurnableTokenUpgradeable.sol";
import "../Aave/IAaveLendingPool.sol";
import "./StakingPool/IBNPLNodeStakingPool.sol";
import "../SwapMarket/IBNPLSwapMarket.sol";
import "../Management/IBankNodeManager.sol";

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
        address nodePublicKey;
        uint32 kycMode;
    }

    function initialize(BankNodeInitializeArgsV1 calldata bankNodeInitConfig) external;
}

/**
 * @dev Interface of the IBNPLBankNode standard
 */
interface IBNPLBankNode is IBankNodeInitializableV1 {
    // start structs

    // end structs
    function unusedFundsLendingMode() external view returns (uint16);

    function unusedFundsLendingContract() external view returns (IAaveLendingPool);

    function unusedFundsLendingToken() external view returns (IERC20);

    function bnplSwapMarket() external view returns (IBNPLSwapMarket);

    function bnplSwapMarketPoolFee() external view returns (uint24);

    function bankNodeId() external view returns (uint32);

    function nodeStakingPool() external view returns (IBNPLNodeStakingPool);

    function bankNodeManager() external view returns (IBankNodeManager);

    function baseTokenBalance() external view returns (uint256);

    function nodeOperatorBalance() external view returns (uint256);

    function accountsReceivableFromLoans() external view returns (uint256);

    function poolTokensCirculating() external view returns (uint256);

    function loanRequestIndex() external view returns (uint256);

    function onGoingLoanCount() external view returns (uint256);

    function loanIndex() external view returns (uint256);

    function baseLiquidityToken() external view returns (IERC20);

    function poolLiquidityToken() external view returns (IMintableBurnableTokenUpgradeable);

    function interestPaidForLoan(uint256 loanId) external view returns (uint256);

    function loanBondedAmount(uint256 loanId) external view returns (uint256);

    function totalLossAllTime() external view returns (uint256);

    function totalDonatedAllTime() external view returns (uint256);

    function totalLoansDefaulted() external view returns (uint256);

    function nodePublicKey() external view returns (address);

    function kycMode() external view returns (uint256);

    function kycDomainId() external view returns (uint32);

    function bnplKYCStore() external view returns (BNPLKYCStore);

    function loanRequests(uint256 _loanRequestId)
        external
        view
        returns (
            address borrower,
            uint256 loanAmount,
            uint64 totalLoanDuration,
            uint32 numberOfPayments,
            uint256 amountPerPayment,
            uint256 interestRatePerPayment,
            uint8 status, // 0 = under review, 1 = rejected, 2 = cancelled, 3 = *unused for now*, 4 = approved
            uint64 statusUpdatedAt,
            address statusModifiedBy,
            uint256 interestRate,
            uint256 loanId,
            uint8 messageType, // 0 = plain text, 1 = encrypted with the public key
            string memory message
        );

    function loans(uint256 _loanId)
        external
        view
        returns (
            address borrower,
            uint256 loanAmount,
            uint64 totalLoanDuration,
            uint32 numberOfPayments,
            uint64 loanStartedAt,
            uint32 numberOfPaymentsMade,
            uint256 amountPerPayment,
            uint256 interestRatePerPayment,
            uint256 totalAmountPaid,
            uint256 remainingBalance,
            uint8 status, // 0 = ongoing, 1 = completed, 2 = overdue, 3 = written off
            uint64 statusUpdatedAt,
            uint256 loanRequestId
        );

    /*
    mapping(uint256 => LoanRequest) public loanRequests;
    mapping(uint256 => Loan) public loans;
    */

    // end public vars

    function donate(uint256 depositAmount) external;

    function addLiquidity(uint256 depositAmount) external;

    function removeLiquidity(uint256 withdrawAmount) external;

    function requestLoan(
        uint256 loanAmount,
        uint64 totalLoanDuration,
        uint32 numberOfPayments,
        uint256 amountPerPayment,
        uint8 messageType,
        string memory message
    ) external;

    function denyLoanRequest(uint256 loanRequestId) external;

    function approveLoanRequest(uint256 loanRequestId) external;

    function makeLoanPayment(uint256 loanId) external;

    function reportOverdueLoan(uint256 loanId) external;

    function withdrawNodeOperatorBalance(uint256 amount, address to) external;

    function setKYCSettings(uint256 kycMode_, address nodePublicKey_) external;
}
