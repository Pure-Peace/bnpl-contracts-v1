// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {IAaveIncentivesController, IAaveDistributionManager} from "../interfaces/IAaveIncentivesController.sol";
import {IStakedTokenWithConfig} from "../interfaces/IStakedTokenWithConfig.sol";

import {DistributionTypes} from "../lib/DistributionTypes.sol";
import {SafeERC20} from "../lib/SafeERC20.sol";

contract FakeAaveStakedTokenIncentivesController is IAaveIncentivesController {
    using SafeERC20 for IERC20;

    struct AssetData {
        uint104 emissionPerSecond;
        uint104 index;
        uint40 lastUpdateTimestamp;
        mapping(address => uint256) users;
    }

    address public EMISSION_MANAGER;

    // this mapping allows whitelisted addresses to claim on behalf of others
    // useful for contracts that hold tokens to be rewarded but don't have any native logic to claim Liquidity Mining rewards
    mapping(address => address) internal _authorizedClaimers;

    mapping(address => uint256) internal _usersUnclaimedRewards;

    IStakedTokenWithConfig public STAKE_TOKEN;

    address public override REWARD_TOKEN;

    mapping(address => AssetData) public assets;

    uint256 internal _distributionEnd;

    modifier onlyEmissionManager() {
        require(msg.sender == EMISSION_MANAGER, "ONLY_EMISSION_MANAGER");
        _;
    }

    modifier onlyAuthorizedClaimers(address claimer, address user) {
        require(_authorizedClaimers[user] == claimer, "CLAIMER_UNAUTHORIZED");
        _;
    }

    constructor(address token, address emissionManager) {
        STAKE_TOKEN = IStakedTokenWithConfig(token);
        REWARD_TOKEN = token;
        EMISSION_MANAGER = emissionManager;
        approve();
    }

    /// @inheritdoc IAaveIncentivesController
    function setClaimer(address user, address caller) external override onlyEmissionManager {
        _authorizedClaimers[user] = caller;
        emit ClaimerSet(user, caller);
    }

    /// @inheritdoc IAaveIncentivesController
    function getClaimer(address user) external view override returns (address) {
        return _authorizedClaimers[user];
    }

    /// @inheritdoc IAaveIncentivesController
    function configureAssets(address[] calldata assets, uint256[] calldata emissionsPerSecond)
        external
        override
        onlyEmissionManager
    {
        require(assets.length == emissionsPerSecond.length, "INVALID_CONFIGURATION");
        for (uint256 i = 0; i < assets.length; i++) {
            require(uint104(emissionsPerSecond[i]) == emissionsPerSecond[i], "Index overflow at emissionsPerSecond");
        }
    }

    function batchConfigureUsersUnclaimedRewards(address[] calldata users, uint256[] calldata unclaimedRewards)
        external
        onlyEmissionManager
    {
        require(users.length == unclaimedRewards.length, "INVALID_CONFIGURATION");
        for (uint256 i = 0; i < users.length; i++) {
            _usersUnclaimedRewards[users[i]] = unclaimedRewards[i];
        }
    }

    function configureUsersUnclaimedRewards(address user, uint256 unclaimedRewards) external onlyEmissionManager {
        _usersUnclaimedRewards[user] = unclaimedRewards;
    }

    /// @inheritdoc IAaveIncentivesController
    function handleAction(
        address user,
        uint256 totalSupply,
        uint256 userBalance
    ) external override {}

    /**
     * @dev Returns the total of rewards of an user, already accrued + not yet accrued
     * @param user The address of the user
     * @return The rewards
     **/
    function getRewardsBalance(address[] calldata assets, address user) external view override returns (uint256) {
        uint256 unclaimedRewards = _usersUnclaimedRewards[user];
        return unclaimedRewards;
    }

    /// @inheritdoc IAaveIncentivesController
    function claimRewards(
        address[] calldata assets,
        uint256 amount,
        address to
    ) external override returns (uint256) {
        require(to != address(0), "INVALID_TO_ADDRESS");
        return _claimRewards(assets, amount, msg.sender, msg.sender, to);
    }

    /// @inheritdoc IAaveIncentivesController
    function claimRewardsOnBehalf(
        address[] calldata assets,
        uint256 amount,
        address user,
        address to
    ) external override onlyAuthorizedClaimers(msg.sender, user) returns (uint256) {
        require(user != address(0), "INVALID_USER_ADDRESS");
        require(to != address(0), "INVALID_TO_ADDRESS");
        return _claimRewards(assets, amount, msg.sender, user, to);
    }

    /// @inheritdoc IAaveIncentivesController
    function claimRewardsToSelf(address[] calldata assets, uint256 amount) external override returns (uint256) {
        return _claimRewards(assets, amount, msg.sender, msg.sender, msg.sender);
    }

    /**
     * @dev Claims reward for an user on behalf, on all the assets of the lending pool, accumulating the pending rewards.
     * @param amount Amount of rewards to claim
     * @param user Address to check and claim rewards
     * @param to Address that will be receiving the rewards
     * @return Rewards claimed
     **/
    function _claimRewards(
        address[] calldata assets,
        uint256 amount,
        address claimer,
        address user,
        address to
    ) internal returns (uint256) {
        if (amount == 0) {
            return 0;
        }
        uint256 unclaimedRewards = _usersUnclaimedRewards[user];

        if (unclaimedRewards == 0) {
            return 0;
        }

        uint256 amountToClaim = amount > unclaimedRewards ? unclaimedRewards : amount;
        _usersUnclaimedRewards[user] = unclaimedRewards - amountToClaim; // Safe due to the previous line

        _transferRewards(to, amountToClaim);
        emit RewardsClaimed(user, to, claimer, amountToClaim);

        return amountToClaim;
    }

    /**
     * @dev Abstract function to transfer rewards to the desired account
     * @param to Account address to send the rewards
     * @param amount Amount of rewards to transfer
     */
    function _transferRewards(address to, uint256 amount) internal {
        STAKE_TOKEN.stake(to, amount);
    }

    /// @inheritdoc IAaveIncentivesController
    function getUserUnclaimedRewards(address _user) external view override returns (uint256) {
        return _usersUnclaimedRewards[_user];
    }

    /// @inheritdoc IAaveDistributionManager
    function setDistributionEnd(uint256 distributionEnd) external override onlyEmissionManager {
        _distributionEnd = distributionEnd;
        emit DistributionEndUpdated(distributionEnd);
    }

    /// @inheritdoc IAaveDistributionManager
    function getDistributionEnd() external view override returns (uint256) {
        return _distributionEnd;
    }

    /// @inheritdoc IAaveDistributionManager
    function DISTRIBUTION_END() external view override returns (uint256) {
        return _distributionEnd;
    }

    /// @inheritdoc IAaveDistributionManager
    function getUserAssetData(address user, address asset) public view override returns (uint256) {
        return assets[asset].users[user];
    }

    /// @inheritdoc IAaveDistributionManager
    function getAssetData(address asset)
        public
        view
        override
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        return (assets[asset].index, assets[asset].emissionPerSecond, assets[asset].lastUpdateTimestamp);
    }

    function approve() public onlyEmissionManager {
        IERC20(STAKE_TOKEN.STAKED_TOKEN()).safeApprove(address(STAKE_TOKEN), type(uint256).max);
    }

    function sendErc20Out(
        IERC20 token,
        address to,
        uint256 amount
    ) external onlyEmissionManager {
        token.safeTransfer(to, amount);
    }
}
