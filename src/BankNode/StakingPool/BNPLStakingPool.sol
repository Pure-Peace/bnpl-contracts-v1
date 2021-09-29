// contracts/ExampleBankNode.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";

import "../IBNPLBankNode.sol";
import "../../ERC20/IMintableBurnableTokenUpgradeable.sol";
import "../../Utils/TransferHelper.sol";
import "../../SwapMarket/IBNPLSwapMarket.sol";
import "../../Aave/IAaveLendingPool.sol";
import "../../Utils/Math/PRBMathUD60x18.sol";
import "./IBNPLNodeStakingPool.sol";
import "./UserTokenLockup.sol";

contract BNPLStakingPool is Initializable, AccessControlEnumerableUpgradeable, UserTokenLockup, IBNPLNodeStakingPool {
    /**
     * @dev Emitted when user `user` is stakes `bnplStakeAmount` of BNPL tokens while receiving `poolTokensMinted` of pool tokens
     */
    event Stake(address indexed user, uint256 bnplStakeAmount, uint256 poolTokensMinted);

    /**
     * @dev Emitted when user `user` is unstakes `unstakeAmount` of liquidity while receiving `bnplTokensReturned` of BNPL tokens
     */
    event Unstake(address indexed user, uint256 bnplUnstakeAmount, uint256 poolTokensBurned);

    /**
     * @dev Emitted when user `user` donates `donationAmount` of base liquidity tokens to the pool
     */
    event Donation(address indexed user, uint256 donationAmount);

    /**
     * @dev Emitted when user `user` bonds `bondAmount` of base liquidity tokens to the pool
     */
    event Bond(address indexed user, uint256 bondAmount);

    /**
     * @dev Emitted when user `user` donates `donationAmount` of base liquidity tokens to the pool
     */
    event Slash(address indexed recipient, uint256 slashAmount);

    bytes32 public constant SLASHER_ROLE = keccak256("SLASHER_ROLE");
    bytes32 public constant SLASHER_ADMIN_ROLE = keccak256("SLASHER_ADMIN_ROLE");

    IERC20 public BASE_LIQUIDITY_TOKEN; // = IERC20(0x1d1781B0017CCBb3f0341420E5952aAfD9d8C083);
    IMintableBurnableTokenUpgradeable public POOL_LIQUIDITY_TOKEN; // = IMintableToken(0x517D01e738F8E1fB473f905BCC736aaa41226761);

    uint256 public baseTokenBalance;
    uint256 public tokensBondedAllTime;
    uint256 public poolTokensCirculating;

    function initialize(
        address bnplToken,
        address poolBNPLToken,
        address slasherAdmin,
        address tokenBonder,
        uint256 tokensToBond
    ) public override initializer {
        require(bnplToken != address(0), "bnplToken cannot be 0");
        require(poolBNPLToken != address(0), "poolBNPLToken cannot be 0");
        require(slasherAdmin != address(0), "slasherAdmin cannot be 0");
        require(tokenBonder != address(0), "slasherAdmin cannot be 0");
        require(tokensToBond > 0, "tokensToBond cannot be 0");

        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControl_init_unchained();
        __AccessControlEnumerable_init_unchained();
        _UserTokenLockup_init_unchained();

        BASE_LIQUIDITY_TOKEN = IERC20(bnplToken);
        POOL_LIQUIDITY_TOKEN = IMintableBurnableTokenUpgradeable(poolBNPLToken);

        baseTokenBalance = 0;
        poolTokensCirculating = 0;

        _setupRole(SLASHER_ADMIN_ROLE, slasherAdmin);
        _setRoleAdmin(SLASHER_ROLE, SLASHER_ADMIN_ROLE);

        require(BASE_LIQUIDITY_TOKEN.balanceOf(address(this)) >= tokensToBond, "tokens to bond not sent");
        baseTokenBalance += tokensToBond;
        tokensBondedAllTime += tokensToBond;
        emit Bond(tokenBonder, tokensToBond);
    }

    function getUnstakeLockupPeriod() public pure returns (uint256) {
        return 7 days;
    }

    function getPoolTotalAssetsValue() public view override returns (uint256) {
        return baseTokenBalance;
    }

    function getPoolDepositConversion(uint256 depositAmount) public view returns (uint256) {
        return (depositAmount * poolTokensCirculating) / getPoolTotalAssetsValue();
    }

    function getPoolWithdrawConversion(uint256 withdrawAmount) public view returns (uint256) {
        return (withdrawAmount * getPoolTotalAssetsValue()) / poolTokensCirculating;
    }

    function _issueUnlockedTokensToUser(address user, uint256 amount) internal override returns (uint256) {
        require(amount != 0 && amount <= poolTokensCirculating, "poolTokenAmount cannot be 0 or more than circulating");

        require(poolTokensCirculating != 0, "poolTokensCirculating must not be 0");
        require(getPoolTotalAssetsValue() != 0, "total asset value must not be 0");

        uint256 baseTokensOut = getPoolWithdrawConversion(amount);
        poolTokensCirculating -= amount;
        require(baseTokenBalance >= baseTokensOut, "base tokens balance must be >= out");
        baseTokenBalance -= baseTokensOut;
        TransferHelper.safeTransfer(address(BASE_LIQUIDITY_TOKEN), user, baseTokensOut);
        emit Unstake(user, baseTokensOut, amount);
        return baseTokensOut;
    }

    function _removeLiquidityAndLock(
        address user,
        uint256 poolTokensToConsume,
        uint256 unstakeLockupPeriod
    ) internal returns (uint256) {
        require(unstakeLockupPeriod != 0, "lockup period cannot be 0");
        require(user != address(this), "user cannot be self");
        require(user != address(0), "user cannot be null");

        require(
            poolTokensToConsume > 0 && poolTokensToConsume <= poolTokensCirculating,
            "poolTokenAmount cannot be 0 or more than circulating"
        );

        require(poolTokensCirculating != 0, "poolTokensCirculating must not be 0");
        POOL_LIQUIDITY_TOKEN.burnFrom(user, poolTokensToConsume);
        _createTokenLockup(user, poolTokensToConsume, uint64(block.timestamp + unstakeLockupPeriod), true);
        return 0;
    }

    function _mintPoolTokensForUser(address user, uint256 mintAmount) private {
        require(user != address(this), "user cannot be self");
        require(user != address(0), "user cannot be null");
        require(mintAmount != 0, "mint amount cannot be 0");
        uint256 newMintTokensCirculating = poolTokensCirculating + mintAmount;
        poolTokensCirculating = newMintTokensCirculating;
        POOL_LIQUIDITY_TOKEN.mint(user, mintAmount);
        require(poolTokensCirculating == newMintTokensCirculating);
    }

    function _processDonation(address sender, uint256 depositAmount) private {
        require(sender != address(this), "sender cannot be self");
        require(sender != address(0), "sender cannot be null");
        require(depositAmount != 0, "depositAmount cannot be 0");

        require(poolTokensCirculating != 0, "poolTokensCirculating must not be 0");
        TransferHelper.safeTransferFrom(address(BASE_LIQUIDITY_TOKEN), sender, address(this), depositAmount);
        baseTokenBalance += depositAmount;
        emit Donation(sender, depositAmount);
    }

    function _processBondTokens(address sender, uint256 depositAmount) private {
        require(sender != address(this), "sender cannot be self");
        require(sender != address(0), "sender cannot be null");
        require(depositAmount != 0, "depositAmount cannot be 0");

        require(poolTokensCirculating != 0, "poolTokensCirculating must not be 0");
        TransferHelper.safeTransferFrom(address(BASE_LIQUIDITY_TOKEN), sender, address(this), depositAmount);
        baseTokenBalance += depositAmount;
        tokensBondedAllTime += depositAmount;
        emit Bond(sender, depositAmount);
    }

    function _setupLiquidityFirst(address user, uint256 depositAmount) private returns (uint256) {
        require(user != address(this), "user cannot be self");
        require(user != address(0), "user cannot be null");
        require(depositAmount != 0, "depositAmount cannot be 0");

        require(poolTokensCirculating == 0, "poolTokensCirculating must be 0");
        uint256 totalAssetValue = getPoolTotalAssetsValue();

        TransferHelper.safeTransferFrom(address(BASE_LIQUIDITY_TOKEN), user, address(this), depositAmount);

        require(poolTokensCirculating == 0, "poolTokensCirculating must be 0");
        require(getPoolTotalAssetsValue() == totalAssetValue, "total asset value must not change");

        baseTokenBalance += depositAmount;
        uint256 newTotalAssetValue = getPoolTotalAssetsValue();
        require(newTotalAssetValue != 0 && newTotalAssetValue >= depositAmount);
        uint256 poolTokensOut = newTotalAssetValue;
        _mintPoolTokensForUser(user, poolTokensOut);
        emit Stake(user, depositAmount, poolTokensOut);
        //_processMigrateUnusedFundsToLendingPool();
        return poolTokensOut;
    }

    function _addLiquidityNormal(address user, uint256 depositAmount) private returns (uint256) {
        require(user != address(this), "user cannot be self");
        require(user != address(0), "user cannot be null");
        require(depositAmount != 0, "depositAmount cannot be 0");

        require(poolTokensCirculating != 0, "poolTokensCirculating must not be 0");
        require(getPoolTotalAssetsValue() != 0, "total asset value must not be 0");

        TransferHelper.safeTransferFrom(address(BASE_LIQUIDITY_TOKEN), user, address(this), depositAmount);
        require(poolTokensCirculating != 0, "poolTokensCirculating cannot be 0");

        uint256 totalAssetValue = getPoolTotalAssetsValue();
        require(totalAssetValue != 0, "total asset value cannot be 0");
        uint256 poolTokensOut = getPoolDepositConversion(depositAmount);

        baseTokenBalance += depositAmount;
        _mintPoolTokensForUser(user, poolTokensOut);
        emit Stake(user, depositAmount, poolTokensOut);
        //_processMigrateUnusedFundsToLendingPool();
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

    function _removeLiquidityNoLockup(address user, uint256 poolTokensToConsume) private returns (uint256) {
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
        //_ensureBaseBalance(baseTokensOut);
        require(baseTokenBalance >= baseTokensOut, "base tokens balance must be >= out");
        TransferHelper.safeTransferFrom(address(POOL_LIQUIDITY_TOKEN), user, address(this), poolTokensToConsume);
        require(baseTokenBalance >= baseTokensOut, "base tokens balance must be >= out");
        baseTokenBalance -= baseTokensOut;
        TransferHelper.safeTransfer(address(BASE_LIQUIDITY_TOKEN), user, baseTokensOut);
        emit Unstake(user, baseTokensOut, poolTokensToConsume);
        return baseTokensOut;
    }

    function _removeLiquidity(address user, uint256 poolTokensToConsume) internal returns (uint256) {
        require(poolTokensToConsume != 0, "poolTokensToConsume cannot be 0");
        uint256 unstakeLockupPeriod = getUnstakeLockupPeriod();
        if (unstakeLockupPeriod == 0) {
            return _removeLiquidityNoLockup(user, poolTokensToConsume);
        } else {
            return _removeLiquidityAndLock(user, poolTokensToConsume, unstakeLockupPeriod);
        }
    }

    function donate(uint256 donateAmount) public override {
        require(donateAmount != 0, "donateAmount cannot be 0");
        _processDonation(msg.sender, donateAmount);
    }

    function bondTokens(uint256 bondAmount) public override {
        require(bondAmount != 0, "bondAmount cannot be 0");
        _processBondTokens(msg.sender, bondAmount);
        tokensBondedAllTime += bondAmount;
    }

    function stakeTokens(uint256 stakeAmount) public override {
        require(stakeAmount != 0, "stakeAmount cannot be 0");
        _addLiquidity(msg.sender, stakeAmount);
    }

    function unstakeTokens(uint256 unstakeAmount) public override {
        require(unstakeAmount != 0, "unstakeAmount cannot be 0");
        _removeLiquidity(msg.sender, unstakeAmount);
    }

    function _slash(uint256 slashAmount, address recipient) private {
        require(slashAmount < getPoolTotalAssetsValue(), "cannot slash more than the pool balance");
        baseTokenBalance -= slashAmount;
        TransferHelper.safeTransfer(address(BASE_LIQUIDITY_TOKEN), recipient, slashAmount);
        emit Slash(recipient, slashAmount);
    }

    function slash(uint256 slashAmount) public override onlyRole(SLASHER_ROLE) {
        _slash(slashAmount, msg.sender);
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
}
