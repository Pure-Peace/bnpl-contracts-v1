// contracts/ExampleBankNode.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";

import "./IBNPLBankNode.sol";
import "../ERC20/IMintableBurnableTokenUpgradeable.sol";
import "../Utils/TransferHelper.sol";
import "../Utils/Math/PRBMathUD60x18.sol";

contract BNPLBankNode is Initializable, AccessControlEnumerableUpgradeable, IBNPLBankNode {
    /**
     * @dev Emitted when user `user` is adds `depositAmount` of liquidity while receiving `issueAmount` of pool tokens
     */
    event LiquidityAdded(address indexed user, uint256 depositAmount, uint256 poolTokensIssued);

    /**
     * @dev Emitted when user `user` burns `withdrawAmount` of pool tokens while receiving `issueAmount` of pool tokens
     */
    event LiquidityRemoved(address indexed user, uint256 withdrawAmount, uint256 poolTokensConsumed);

    /**
     * @dev Emitted when user `user` donates `donationAmount` of base liquidity tokens to the pool
     */
    event Donation(address indexed user, uint256 donationAmount);

    /**
     * @dev Emitted when user `user` requests a loan of `loanAmount` with a loan request id of loanRequestId
     */
    event LoanRequested(address indexed borrower, uint256 loanAmount, uint256 loanRequestId);

    /**
     * @dev Emitted when a node manager `operator` denies a loan request with id `loanRequestId`
     */
    event LoanDenied(address indexed borrower, uint256 loanRequestId, address operator);

    /**
     * @dev Emitted when a node manager `operator` approves a loan request with id `loanRequestId`
     */
    event LoanApproved(
        address indexed borrower,
        uint256 loanRequestId,
        uint256 loanId,
        uint256 loanAmount,
        address operator
    );

    /**
     * @dev Emitted when user `borrower` makes a payment on the loan request with id `loanRequestId`
     */
    event LoanPayment(address indexed borrower, uint256 loanId, uint256 paymentAmount);

    struct LoanRequest {
        address borrower;
        uint256 loanAmount;
        uint64 totalLoanDuration;
        uint32 numberOfPayments;
        uint256 amountPerPayment;
        uint256 interestRatePerPayment;
        uint8 status; // 0 = under review, 1 = rejected, 2 = cancelled, 3 = *unused for now*, 4 = approved
        uint64 statusUpdatedAt;
        address statusModifiedBy;
        uint256 interestRate;
        uint256 loanId;
        uint8 messageType; // 0 = plain text, 1 = encrypted with the public key
        string message;
    }

    struct Loan {
        address borrower;
        uint256 loanAmount;
        uint64 totalLoanDuration;
        uint32 numberOfPayments;
        uint64 loanStartedAt;
        uint32 numberOfPaymentsMade;
        uint256 amountPerPayment;
        uint256 interestRatePerPayment;
        uint256 totalAmountPaid;
        uint256 remainingBalance;
        uint8 status; // 0 = ongoing, 1 = completed, 2 = overdue, 3 = written off
        uint64 statusUpdatedAt;
        uint256 loanRequestId;
    }

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant OPERATOR_ADMIN_ROLE = keccak256("OPERATOR_ADMIN_ROLE");
    //TODO: Source
    uint256 public constant UNUSED_FUNDS_MIN_DEPOSIT_SIZE = 1;

    uint256 public constant MIN_LOAN_DURATION = 10; //30 days;

    uint256 public constant MIN_LOAN_PAYMENT_INTERVAL = 2; //2 days;

    //TODO: Add max duration and max payment interval

    uint256 public constant MAX_LOAN_AMOUNT = 0xFFFFFFFFFFFFFFFFFFFFFFFFFF00;
    uint256 public constant MIN_LOAN_AMOUNT = 100;

    IERC20 public override baseLiquidityToken; // = IERC20(0xFf795577d9AC8bD7D90Ee22b6C1703490b6512FD);
    IMintableBurnableTokenUpgradeable public override poolLiquidityToken; // = IMintableToken(0x63801824694C6a0482C7416Ea255D6a3745F82f2);

    IERC20 public bnplToken; // = IERC20(0x1d1781B0017CCBb3f0341420E5952aAfD9d8C083);

    uint16 public override unusedFundsLendingMode;
    IAaveLendingPool public override unusedFundsLendingContract;
    IERC20 public override unusedFundsLendingToken;

    IBNPLSwapMarket public override bnplSwapMarket; // = IBNPLSwapMarket(0x121E2e269fD5B33cc6a381EA81E1A6D7ec142692);
    uint24 public override bnplSwapMarketPoolFee;

    uint32 public override bankNodeId;

    IBNPLNodeStakingPool public override nodeStakingPool; // = IBNPLNodeStakingPool(0x2643be3DaeD4566B42150B291f75D19B1a23098E);
    IBankNodeManager public override bankNodeManager;

    uint256 public override baseTokenBalance;
    uint256 public override nodeOperatorBalance;
    uint256 public override accountsReceivableFromLoans;
    uint256 public override poolTokensCirculating;

    uint256 public override loanRequestIndex;

    uint256 public override loanIndex;

    mapping(uint256 => LoanRequest) public override loanRequests;
    mapping(uint256 => Loan) public override loans;

    mapping(uint256 => uint256) public override interestPaidForLoan;
    mapping(uint256 => uint256) public override loanBondedAmount;

    function initialize(BankNodeInitializeArgsV1 calldata bankNodeInitConfig) public override initializer {
        require(
            bankNodeInitConfig.unusedFundsLendingMode == 1,
            "unused funds lending mode currently only supports aave (1)"
        );

        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControl_init_unchained();
        __AccessControlEnumerable_init_unchained();

        baseLiquidityToken = IERC20(bankNodeInitConfig.baseLiquidityToken);
        poolLiquidityToken = IMintableBurnableTokenUpgradeable(bankNodeInitConfig.poolLiquidityToken);

        bnplToken = IERC20(bankNodeInitConfig.bnplToken);
        unusedFundsLendingMode = bankNodeInitConfig.unusedFundsLendingMode;
        unusedFundsLendingToken = IERC20(bankNodeInitConfig.unusedFundsLendingToken);
        unusedFundsLendingContract = IAaveLendingPool(bankNodeInitConfig.unusedFundsLendingContract);

        bnplSwapMarket = IBNPLSwapMarket(bankNodeInitConfig.bnplSwapMarket);

        nodeStakingPool = IBNPLNodeStakingPool(bankNodeInitConfig.nodeStakingPool);
        bankNodeManager = IBankNodeManager(bankNodeInitConfig.bankNodeManager);
        bnplSwapMarketPoolFee = bankNodeInitConfig.bnplSwapMarketPoolFee;
        bankNodeId = bankNodeInitConfig.bankNodeId;

        if (bankNodeInitConfig.operator != address(0)) {
            _setupRole(OPERATOR_ROLE, bankNodeInitConfig.operator);
        }
        if (bankNodeInitConfig.operatorAdmin != address(0)) {
            _setupRole(OPERATOR_ADMIN_ROLE, bankNodeInitConfig.operatorAdmin);
            _setRoleAdmin(OPERATOR_ROLE, OPERATOR_ADMIN_ROLE);
        }
    }

    function getValueOfUnusedFundsLendingDeposits() public view returns (uint256) {
        return unusedFundsLendingToken.balanceOf(address(this));
    }

    function getPoolTotalAssetsValue() public view returns (uint256) {
        return baseTokenBalance + getValueOfUnusedFundsLendingDeposits() + accountsReceivableFromLoans;
    }

    function getPoolTotalLiquidAssetsValue() public view returns (uint256) {
        return baseTokenBalance + getValueOfUnusedFundsLendingDeposits();
    }

    function getPoolDepositConversion(uint256 depositAmount) public view returns (uint256) {
        return (depositAmount * poolTokensCirculating) / getPoolTotalAssetsValue();
    }

    function getPoolWithdrawConversion(uint256 withdrawAmount) public view returns (uint256) {
        return (withdrawAmount * getPoolTotalAssetsValue()) / poolTokensCirculating;
    }

    function calculateSlashAmount(
        uint256 prevNodeBalance,
        uint256 nodeLoss,
        uint256 poolBalance
    ) public pure returns (uint256) {
        uint256 slashRatio = PRBMathUD60x18.div(
            nodeLoss * PRBMathUD60x18.scale(),
            prevNodeBalance * PRBMathUD60x18.scale()
        );
        return (poolBalance * slashRatio) / PRBMathUD60x18.scale();
    }

    function getMonthlyInterestPayment(
        uint256 loanAmount,
        uint256 interestAmount,
        uint256 numberOfPayments,
        uint256 currentMonth
    ) public pure returns (uint256) {
        return
            (loanAmount *
                PRBMathUD60x18.mul(
                    getPrincipleForMonth(interestAmount, numberOfPayments, currentMonth - 1),
                    interestAmount
                )) / PRBMathUD60x18.scale();
    }

    function getLoanNextDueDate(uint256 loanId) public view returns (uint64) {
        Loan memory loan = loans[loanId];
        require(loan.loanStartedAt > 0);
        require(loan.numberOfPaymentsMade < loan.numberOfPayments);
        uint256 nextPaymentDate = ((uint256(loan.numberOfPaymentsMade + 1) * uint256(loan.totalLoanDuration)) /
            uint256(loan.numberOfPayments)) + uint256(loan.loanStartedAt);
        return uint64(nextPaymentDate);
    }

    function getPrincipleForMonth(
        uint256 interestAmount,
        uint256 numberOfPayments,
        uint256 currentMonth
    ) public pure returns (uint256) {
        uint256 ip1 = (PRBMathUD60x18.scale() + interestAmount);
        uint256 ip1m = PRBMathUD60x18.pow(ip1, currentMonth);
        uint256 pin = getPaymentMultiplier(interestAmount, numberOfPayments);
        uint256 rightFrac = PRBMathUD60x18.div(ip1m - PRBMathUD60x18.scale(), interestAmount);
        uint256 right = PRBMathUD60x18.mul(pin, rightFrac);
        return ip1m - right;
    }

    function getMonthlyPayment(
        uint256 loanAmount,
        uint256 interestAmount,
        uint256 numberOfPayments
    ) public pure returns (uint256) {
        return (loanAmount * getPaymentMultiplier(interestAmount, numberOfPayments)) / PRBMathUD60x18.scale();
    }

    function getPaymentMultiplier(uint256 interestAmount, uint256 numberOfPayments) public pure returns (uint256) {
        uint256 ip1 = (PRBMathUD60x18.scale() + interestAmount);
        uint256 ip1n = PRBMathUD60x18.pow(ip1, numberOfPayments);
        uint256 top = PRBMathUD60x18.mul(interestAmount, ip1n);
        uint256 bottom = (ip1n - PRBMathUD60x18.scale());
        uint256 result = PRBMathUD60x18.div(top, bottom);
        return result;
    }

    function _withdrawFromAaveToBaseBalance(uint256 amount) private {
        require(amount != 0, "amount cannot be 0");
        uint256 ourAaveBalance = unusedFundsLendingToken.balanceOf(address(this));
        require(amount <= ourAaveBalance, "amount exceeds aave balance!");
        unusedFundsLendingContract.withdraw(address(baseLiquidityToken), amount, address(this));
        baseTokenBalance += amount;
    }

    function _depositToAaveFromBaseBalance(uint256 amount) private {
        require(amount != 0, "amount cannot be 0");
        require(amount <= baseTokenBalance, "amount exceeds base token balance!");
        baseTokenBalance -= amount;
        baseLiquidityToken.approve(address(unusedFundsLendingContract), amount);
        unusedFundsLendingContract.deposit(address(baseLiquidityToken), amount, address(this), 0);
        // baseLiquidityToken.approve(address(unusedFundsLendingContract), 0);
    }

    function _ensureBaseBalance(uint256 amount) private {
        require(amount != 0, "amount cannot be 0");
        require(getPoolTotalLiquidAssetsValue() >= amount, "amount cannot be greater than total liquid asset value");
        if (amount > baseTokenBalance) {
            uint256 balanceDifference = amount - baseTokenBalance;
            _withdrawFromAaveToBaseBalance(balanceDifference);
        }
        require(amount <= baseTokenBalance, "error ensuring base balance");
    }

    function _processMigrateUnusedFundsToLendingPool() private {
        require(UNUSED_FUNDS_MIN_DEPOSIT_SIZE > 0, "UNUSED_FUNDS_MIN_DEPOSIT_SIZE > 0");
        if (baseTokenBalance >= UNUSED_FUNDS_MIN_DEPOSIT_SIZE) {
            _depositToAaveFromBaseBalance(baseTokenBalance);
        }
    }

    function _mintPoolTokensForUser(address user, uint256 mintAmount) private {
        require(user != address(this), "user cannot be self");
        require(user != address(0), "user cannot be null");
        require(mintAmount != 0, "mint amount cannot be 0");
        uint256 newMintTokensCirculating = poolTokensCirculating + mintAmount;
        poolTokensCirculating = newMintTokensCirculating;
        poolLiquidityToken.mint(user, mintAmount);
        require(poolTokensCirculating == newMintTokensCirculating);
    }

    function _processDonation(address sender, uint256 depositAmount) private {
        require(sender != address(this), "sender cannot be self");
        require(sender != address(0), "sender cannot be null");
        require(depositAmount != 0, "depositAmount cannot be 0");

        require(poolTokensCirculating != 0, "poolTokensCirculating must not be 0");
        TransferHelper.safeTransferFrom(address(baseLiquidityToken), sender, address(this), depositAmount);
        baseTokenBalance += depositAmount;
        emit Donation(sender, depositAmount);
    }

    function _setupLiquidityFirst(address user, uint256 depositAmount) private returns (uint256) {
        require(user != address(this), "user cannot be self");
        require(user != address(0), "user cannot be null");
        require(depositAmount != 0, "depositAmount cannot be 0");

        require(poolTokensCirculating == 0, "poolTokensCirculating must be 0");
        uint256 totalAssetValue = getPoolTotalAssetsValue();

        TransferHelper.safeTransferFrom(address(baseLiquidityToken), user, address(this), depositAmount);

        require(poolTokensCirculating == 0, "poolTokensCirculating must be 0");
        require(getPoolTotalAssetsValue() == totalAssetValue, "total asset value must not change");

        baseTokenBalance += depositAmount;
        uint256 newTotalAssetValue = getPoolTotalAssetsValue();
        require(newTotalAssetValue != 0 && newTotalAssetValue >= depositAmount);
        uint256 poolTokensOut = newTotalAssetValue;
        _mintPoolTokensForUser(user, poolTokensOut);
        emit LiquidityAdded(user, depositAmount, poolTokensOut);
        _processMigrateUnusedFundsToLendingPool();
        return poolTokensOut;
    }

    function _addLiquidityNormal(address user, uint256 depositAmount) private returns (uint256) {
        require(user != address(this), "user cannot be self");
        require(user != address(0), "user cannot be null");
        require(depositAmount != 0, "depositAmount cannot be 0");

        require(poolTokensCirculating != 0, "poolTokensCirculating must not be 0");
        require(getPoolTotalAssetsValue() != 0, "total asset value must not be 0");

        TransferHelper.safeTransferFrom(address(baseLiquidityToken), user, address(this), depositAmount);
        require(poolTokensCirculating != 0, "poolTokensCirculating cannot be 0");

        uint256 totalAssetValue = getPoolTotalAssetsValue();
        require(totalAssetValue != 0, "total asset value cannot be 0");
        uint256 poolTokensOut = getPoolDepositConversion(depositAmount);

        baseTokenBalance += depositAmount;
        _mintPoolTokensForUser(user, poolTokensOut);
        emit LiquidityAdded(user, depositAmount, poolTokensOut);
        _processMigrateUnusedFundsToLendingPool();
        return poolTokensOut;
    }

    function _addLiquidity(address user, uint256 depositAmount) private returns (uint256) {
        require(user != address(this), "user cannot be self");
        require(user != address(0), "user cannot be null");

        require(depositAmount != 0, "depositAmount cannot be 0");
        if (poolTokensCirculating == 0) {
            return _setupLiquidityFirst(user, depositAmount);
        } else {
            return _addLiquidityNormal(user, depositAmount);
        }
    }

    function _removeLiquidity(address user, uint256 poolTokensToConsume) private returns (uint256) {
        require(user != address(this), "user cannot be self");
        require(user != address(0), "user cannot be null");

        require(
            poolTokensToConsume != 0 && poolTokensToConsume <= poolTokensCirculating,
            "poolTokenAmount cannot be 0 or more than circulating"
        );

        require(poolTokensCirculating != 0, "poolTokensCirculating must not be 0");
        require(getPoolTotalAssetsValue() != 0, "total asset value must not be 0");

        uint256 baseTokensOut = getPoolWithdrawConversion(poolTokensToConsume);
        poolTokensCirculating -= poolTokensToConsume;
        _ensureBaseBalance(baseTokensOut);
        require(baseTokenBalance >= baseTokensOut, "base tokens balance must be >= out");
        TransferHelper.safeTransferFrom(address(poolLiquidityToken), user, address(this), poolTokensToConsume);
        require(baseTokenBalance >= baseTokensOut, "base tokens balance must be >= out");
        baseTokenBalance -= baseTokensOut;
        TransferHelper.safeTransfer(address(baseLiquidityToken), user, baseTokensOut);
        emit LiquidityRemoved(user, baseTokensOut, poolTokensToConsume);
        return baseTokensOut;
    }

    function donate(uint256 depositAmount) public override {
        require(depositAmount != 0, "depositAmount cannot be 0");
        _processDonation(msg.sender, depositAmount);
    }

    function addLiquidity(uint256 depositAmount) public override {
        require(depositAmount != 0, "depositAmount cannot be 0");
        _addLiquidity(msg.sender, depositAmount);
    }

    function removeLiquidity(uint256 poolTokensToConsume) public override {
        _removeLiquidity(msg.sender, poolTokensToConsume);
    }

    function _requestLoan(
        address borrower,
        uint256 loanAmount,
        uint64 totalLoanDuration,
        uint32 numberOfPayments,
        uint256 interestRatePerPayment,
        uint8 messageType,
        string memory message
    ) private {
        require(loanAmount <= MAX_LOAN_AMOUNT);
        require(loanAmount >= MIN_LOAN_AMOUNT);
        require(interestRatePerPayment > 0);

        uint256 amountPerPayment = getMonthlyPayment(loanAmount, interestRatePerPayment, numberOfPayments);

        require(loanAmount <= (amountPerPayment * uint256(numberOfPayments)), "payments not greater than loan amount!");
        require(
            ((totalLoanDuration / uint256(numberOfPayments)) * uint256(numberOfPayments)) == totalLoanDuration,
            "totalLoanDuration must be a multiple of numberOfPayments"
        );
        require(totalLoanDuration >= MIN_LOAN_DURATION, "must be greater than MIN_LOAN_DURATION");
        require(
            (uint256(totalLoanDuration) / uint256(numberOfPayments)) >= MIN_LOAN_PAYMENT_INTERVAL,
            "must be greater than MIN_LOAN_PAYMENT_INTERVAL"
        );

        uint256 currentLoanRequestId = loanRequestIndex;
        loanRequestIndex += 1;
        LoanRequest storage loanRequest = loanRequests[currentLoanRequestId];
        require(loanRequest.borrower == address(0));
        loanRequest.borrower = borrower;
        loanRequest.loanAmount = loanAmount;
        loanRequest.totalLoanDuration = totalLoanDuration;
        loanRequest.interestRatePerPayment = interestRatePerPayment;

        loanRequest.numberOfPayments = numberOfPayments;
        loanRequest.amountPerPayment = amountPerPayment;
        loanRequest.status = 0;
        loanRequest.messageType = messageType;
        loanRequest.message = message;
        emit LoanRequested(borrower, loanAmount, currentLoanRequestId);
    }

    function requestLoan(
        uint256 loanAmount,
        uint64 totalLoanDuration,
        uint32 numberOfPayments,
        uint256 interestRatePerPayment,
        uint8 messageType,
        string memory message
    ) public override {
        _requestLoan(
            msg.sender,
            loanAmount,
            totalLoanDuration,
            numberOfPayments,
            interestRatePerPayment,
            messageType,
            message
        );
    }

    function _approveLoanRequest(address operator, uint256 loanRequestId) private {
        require(loanRequestId < loanRequestIndex, "loan request must exist");
        LoanRequest storage loanRequest = loanRequests[loanRequestId];
        require(loanRequest.borrower != address(0));
        require(loanRequest.status == 0, "loan must not already be approved/rejected");

        uint256 loanAmount = loanRequest.loanAmount;
        require(
            loanAmount <= (loanRequest.amountPerPayment * uint256(loanRequest.numberOfPayments)),
            "payments not greater than loan amount!"
        );
        require(
            ((loanRequest.totalLoanDuration / uint256(loanRequest.numberOfPayments)) *
                uint256(loanRequest.numberOfPayments)) == loanRequest.totalLoanDuration,
            "totalLoanDuration must be a multiple of numberOfPayments"
        );
        require(loanRequest.totalLoanDuration >= MIN_LOAN_DURATION, "must be greater than MIN_LOAN_DURATION");
        require(
            (uint256(loanRequest.totalLoanDuration) / uint256(loanRequest.numberOfPayments)) >=
                MIN_LOAN_PAYMENT_INTERVAL,
            "must be greater than MIN_LOAN_PAYMENT_INTERVAL"
        );

        uint256 currentLoanId = loanIndex;
        loanIndex += 1;
        loanRequest.status = 4;
        loanRequest.loanId = currentLoanId;
        loanRequest.statusUpdatedAt = uint64(block.timestamp);
        loanRequest.statusModifiedBy = operator;

        Loan storage loan = loans[currentLoanId];
        require(loan.borrower == address(0));
        loan.borrower = loanRequest.borrower;
        loan.loanAmount = loanAmount;
        loan.totalLoanDuration = loanRequest.totalLoanDuration;
        loan.numberOfPayments = loanRequest.numberOfPayments;
        loan.amountPerPayment = loanRequest.amountPerPayment;
        loan.interestRatePerPayment = loanRequest.interestRatePerPayment;

        loan.loanStartedAt = uint64(block.timestamp);
        loan.numberOfPaymentsMade = 0;
        loan.remainingBalance = uint256(loan.numberOfPayments) * uint256(loan.amountPerPayment);
        loan.status = 0;
        loan.loanRequestId = loanRequestId;

        _ensureBaseBalance(loanAmount);

        baseTokenBalance -= loanAmount;
        accountsReceivableFromLoans += loanAmount;
        TransferHelper.safeTransfer(address(baseLiquidityToken), loan.borrower, loanAmount);
        emit LoanApproved(loan.borrower, loanRequestId, currentLoanId, loanAmount, operator);
    }

    function _denyLoanRequest(address operator, uint256 loanRequestId) private {
        require(loanRequestId < loanRequestIndex, "loan request must exist");
        LoanRequest storage loanRequest = loanRequests[loanRequestId];
        require(loanRequest.borrower != address(0));
        require(loanRequest.status == 0, "loan must not already be approved/rejected");
        loanRequest.status = 1;
        loanRequest.statusUpdatedAt = uint64(block.timestamp);
        loanRequest.statusModifiedBy = operator;
        emit LoanDenied(loanRequest.borrower, loanRequestId, operator);
    }

    function denyLoanRequest(uint256 loanRequestId) public override onlyRole(OPERATOR_ROLE) {
        _denyLoanRequest(msg.sender, loanRequestId);
    }

    function approveLoanRequest(uint256 loanRequestId) public override onlyRole(OPERATOR_ROLE) {
        _approveLoanRequest(msg.sender, loanRequestId);
    }

    function _marketBuyBNPLForStakingPool(uint256 amountInBaseToken) private {
        require(amountInBaseToken > 0);
        //_ensureBaseBalance(amountInBaseToken);
        TransferHelper.safeApprove(address(baseLiquidityToken), address(bnplSwapMarket), amountInBaseToken);
        //(uint256 amountOut) = bnplSwapMarket.swapTokenForBNPL(address(baseLiquidityToken), amountInBaseToken);

        IBNPLSwapMarket.ExactInputSingleParams memory params = IBNPLSwapMarket.ExactInputSingleParams({
            tokenIn: address(baseLiquidityToken),
            tokenOut: address(bnplToken),
            fee: bnplSwapMarketPoolFee,
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: amountInBaseToken,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        });
        uint256 amountOut = bnplSwapMarket.exactInputSingle(params);
        require(amountOut > 0, "swap amount must be > 0");
        TransferHelper.safeApprove(address(bnplToken), address(nodeStakingPool), amountOut);
        nodeStakingPool.donate(amountOut);
    }

    function _marketSellBNPLForSlashing(uint256 bnplAmount) private {
        require(bnplAmount > 0);
        TransferHelper.safeApprove(address(bnplToken), address(bnplSwapMarket), bnplAmount);
        IBNPLSwapMarket.ExactInputSingleParams memory params = IBNPLSwapMarket.ExactInputSingleParams({
            tokenIn: address(bnplToken),
            tokenOut: address(baseLiquidityToken),
            fee: bnplSwapMarketPoolFee,
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: bnplAmount,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        });
        uint256 amountOut = bnplSwapMarket.exactInputSingle(params);
        //bnplSwapMarket.swapBNPLForToken(address(baseLiquidityToken), bnplAmount);
        require(amountOut > 0, "swap amount must be > 0");
        baseTokenBalance += amountOut;
    }

    function _markLoanAsWriteOff(uint256 loanId) private {
        Loan storage loan = loans[loanId];
        require(loan.borrower != address(0));
        require(
            loan.loanStartedAt < uint64(block.timestamp),
            "cannot make the loan payment on same block loan is created"
        );
        require(loan.remainingBalance > 0, "loan must not be paid off");
        require(loan.status == 0 || loan.status == 2, "loan must not be paid off or already overdue");

        require(getLoanNextDueDate(loanId) < uint64(block.timestamp), "loan must be overdue to write off");
        require(loan.loanAmount > loan.totalAmountPaid);
        uint256 startPoolTotalAssetValue = getPoolTotalAssetsValue();

        //loan.loanAmount-principalPaidForLoan[loanId]
        //uint256 total3rdPartyInterestPaid = loanBondedAmount[loanId]; // bnpl market buy is the same amount as the amount bonded, this must change if they are not equal
        uint256 interestRecirculated = (interestPaidForLoan[loanId] * 8) / 10; // 10% paid to market buy bnpl, 10% bonded

        uint256 accountsReceivableLoss = loan.loanAmount - (loan.totalAmountPaid - interestPaidForLoan[loanId]);
        accountsReceivableFromLoans -= accountsReceivableLoss;
        baseTokenBalance += loanBondedAmount[loanId];
        loanBondedAmount[loanId] = 0;

        uint256 prevBalanceEquivalent = startPoolTotalAssetValue - interestRecirculated;
        require(prevBalanceEquivalent > getPoolTotalAssetsValue());
        uint256 poolBalance = nodeStakingPool.getPoolTotalAssetsValue();
        require(poolBalance > 0);
        uint256 slashAmount = calculateSlashAmount(
            prevBalanceEquivalent,
            prevBalanceEquivalent - getPoolTotalAssetsValue(),
            poolBalance
        );
        require(slashAmount > 0);
        nodeStakingPool.slash(slashAmount);
        _marketSellBNPLForSlashing(slashAmount);

        //uint256 lossAmount = accountsReceivableLoss+amountPaidToBNPLMarketBuy;
    }

    function reportOverdueLoan(uint256 loanId) public override {
        _markLoanAsWriteOff(loanId);
    }

    function _makeLoanPayment(address payer, uint256 loanId) private {
        require(loanId < loanIndex, "loan request must exist");

        Loan storage loan = loans[loanId];
        require(loan.borrower != address(0));
        require(
            loan.loanStartedAt < uint64(block.timestamp),
            "cannot make the loan payment on same block loan is created"
        );

        require(uint64(block.timestamp) <= getLoanNextDueDate(loanId), "loan is overdue");

        uint256 currentPaymentId = loan.numberOfPaymentsMade;
        require(currentPaymentId < loan.numberOfPayments);
        require(loan.remainingBalance > 0);
        require(loan.remainingBalance >= loan.amountPerPayment);
        uint256 interestAmount = getMonthlyInterestPayment(
            loan.loanAmount,
            loan.interestRatePerPayment,
            loan.numberOfPayments,
            loan.numberOfPaymentsMade + 1
        );
        uint256 holdInterest = interestAmount / 5;
        //uint returnInterest = interestAmount - holdInterest;
        uint256 bondedInterest = holdInterest / 2;
        uint256 marketBuyInterest = holdInterest - bondedInterest;

        uint256 amountPerPayment = loan.amountPerPayment;
        require(interestAmount > 0);
        require(bondedInterest > 0);
        require(marketBuyInterest > 0);
        require(amountPerPayment > interestAmount);

        TransferHelper.safeTransferFrom(address(baseLiquidityToken), payer, address(this), amountPerPayment);
        loan.totalAmountPaid += amountPerPayment;
        loan.remainingBalance -= amountPerPayment;
        accountsReceivableFromLoans -= amountPerPayment - interestAmount;
        interestPaidForLoan[loanId] += interestAmount;
        loan.numberOfPaymentsMade = loan.numberOfPaymentsMade + 1;
        loanBondedAmount[loanId] += bondedInterest;

        baseTokenBalance += amountPerPayment - holdInterest;
        _marketBuyBNPLForStakingPool(marketBuyInterest);

        if (loan.remainingBalance == 0) {
            loan.status = 1;
            loan.statusUpdatedAt = uint64(block.timestamp);
            nodeOperatorBalance += loanBondedAmount[loanId];
            loanBondedAmount[loanId] = 0;
        }
        _processMigrateUnusedFundsToLendingPool();

        emit LoanPayment(loan.borrower, loanId, amountPerPayment);
    }

    function makeLoanPayment(uint256 loanId) public override {
        _makeLoanPayment(msg.sender, loanId);
    }
}
