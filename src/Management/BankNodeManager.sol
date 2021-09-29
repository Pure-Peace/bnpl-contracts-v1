// contracts/PoolTokenUpgradeable.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";

import "../Utils/TransferHelper.sol";

import "../BankNode/IBNPLBankNode.sol";
import "../BankNode/StakingPool/IBNPLNodeStakingPool.sol";
import "../ERC20/ITokenInitializableV1.sol";
import "./IBankNodeManager.sol";
import "../ProtocolDeploy/IBNPLProtocolConfig.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

contract BankNodeManager is
    Initializable,
    AccessControlEnumerableUpgradeable,
    ReentrancyGuardUpgradeable,
    IBankNodeManager
{
    bytes32 public constant CONFIGURE_NODE_MANAGER_ROLE = keccak256("CONFIGURE_NODE_MANAGER_ROLE");

    mapping(address => uint8) public override enabledLendableTokens;

    mapping(address => LendableToken) public override lendableTokens;

    mapping(uint32 => BankNode) public override bankNodes;
    mapping(address => uint32) public override bankNodeAddressToId;

    uint256 public override minimumBankNodeBondedAmount;
    uint32 public override bankNodeCount;
    IERC20 public override bnplToken;

    BankNodeLendingRewards public override bankNodeLendingRewards;

    IBNPLProtocolConfig public override protocolConfig;

    function bankNodeIdExists(uint32 bankNodeId) public view override returns (uint256) {
        return (bankNodeId >= 1 && bankNodeId <= bankNodeCount) ? 1 : 0;
    }

    function getBankNodeContract(uint32 bankNodeId) public view override returns (address) {
        require(bankNodeId >= 1 && bankNodeId <= bankNodeCount, "Invalid or unregistered bank node id!");
        return bankNodes[bankNodeId].bankNodeContract;
    }

    function getBankNodeToken(uint32 bankNodeId) public view override returns (address) {
        require(bankNodeId >= 1 && bankNodeId <= bankNodeCount, "Invalid or unregistered bank node id!");
        return bankNodes[bankNodeId].bankNodeToken;
    }

    function getBankNodeStakingPoolContract(uint32 bankNodeId) public view override returns (address) {
        require(bankNodeId >= 1 && bankNodeId <= bankNodeCount, "Invalid or unregistered bank node id!");
        return bankNodes[bankNodeId].bnplStakingPoolContract;
    }

    function getBankNodeStakingPoolToken(uint32 bankNodeId) public view override returns (address) {
        require(bankNodeId >= 1 && bankNodeId <= bankNodeCount, "Invalid or unregistered bank node id!");
        return bankNodes[bankNodeId].bnplStakingPoolToken;
    }

    function getBankNodeLendableToken(uint32 bankNodeId) public view override returns (address) {
        require(bankNodeId >= 1 && bankNodeId <= bankNodeCount, "Invalid or unregistered bank node id!");
        return bankNodes[bankNodeId].lendableToken;
    }

    function initialize(
        IBNPLProtocolConfig _protocolConfig,
        address _configurator,
        uint256 _minimumBankNodeBondedAmount,
        BankNodeLendingRewards _bankNodeLendingRewards
    ) public override initializer nonReentrant {
        require(address(_protocolConfig) != address(0), "_protocolConfig cannot be 0");
        require(_configurator != address(0), "_configurator cannot be 0");
        require(_minimumBankNodeBondedAmount > 0, "_minimumBankNodeBondedAmount cannot be 0");

        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControl_init_unchained();
        __AccessControlEnumerable_init_unchained();
        __ReentrancyGuard_init_unchained();

        protocolConfig = _protocolConfig;

        minimumBankNodeBondedAmount = _minimumBankNodeBondedAmount;
        bankNodeCount = 0;
        bnplToken = IERC20(_protocolConfig.bnplToken());
        require(address(bnplToken) != address(0), "_bnplToken cannot be 0");
        bankNodeLendingRewards = _bankNodeLendingRewards;
        require(address(bankNodeLendingRewards) != address(0), "_bankNodeLendingRewards cannot be 0");

        _setupRole(CONFIGURE_NODE_MANAGER_ROLE, _configurator);
    }

    function addLendableToken(LendableToken calldata _lendableToken, uint8 enabled)
        public
        override
        nonReentrant
        onlyRole(CONFIGURE_NODE_MANAGER_ROLE)
    {
        require(address(_lendableToken.tokenContract) != address(0), "tokenContract must not be 0");
        require(address(_lendableToken.swapMarket) != address(0), "swapMarket must not be 0");
        require(_lendableToken.valueMultiplier > 0, "valueMultiplier must be > 0");
        require(enabled == 0 || enabled == 1, "enabled 1 or 0");

        LendableToken storage lendableToken = lendableTokens[_lendableToken.tokenContract];
        lendableToken.tokenContract = _lendableToken.tokenContract;

        lendableToken.swapMarket = _lendableToken.swapMarket;
        lendableToken.swapMarketPoolFee = _lendableToken.swapMarketPoolFee;

        lendableToken.decimals = _lendableToken.decimals;
        lendableToken.valueMultiplier = _lendableToken.valueMultiplier;
        lendableToken.unusedFundsLendingMode = _lendableToken.unusedFundsLendingMode;
        lendableToken.unusedFundsLendingContract = _lendableToken.unusedFundsLendingContract;
        lendableToken.unusedFundsLendingToken = _lendableToken.unusedFundsLendingToken;

        lendableToken.symbol = _lendableToken.symbol;
        lendableToken.poolSymbol = _lendableToken.poolSymbol;
        enabledLendableTokens[_lendableToken.tokenContract] = enabled;
    }

    function setLendableTokenStatus(address tokenContract, uint8 enabled)
        public
        override
        onlyRole(CONFIGURE_NODE_MANAGER_ROLE)
    {
        require(enabled == 0 || enabled == 1, "enabled 1 or 0");
        enabledLendableTokens[tokenContract] = enabled;
    }

    function setMinimumBankNodeBondedAmount(uint256 _minimumBankNodeBondedAmount)
        public
        override
        onlyRole(CONFIGURE_NODE_MANAGER_ROLE)
    {
        minimumBankNodeBondedAmount = _minimumBankNodeBondedAmount;
    }

    function _createBankNodeLendingPoolTokenClone(
        string memory name,
        string memory symbol,
        uint8 decimalsValue,
        address minterAdmin,
        address minter
    ) private returns (address) {
        BeaconProxy p = new BeaconProxy(
            address(protocolConfig.upBeaconBankNodeLendingPoolToken()),
            abi.encodeWithSelector(
                ITokenInitializableV1.initialize.selector,
                //initialize(string calldata name, string calldata symbol, uint8 decimalsValue, address minterAdmin, address minter) external;
                name,
                symbol,
                decimalsValue,
                minterAdmin,
                minter
            )
        );
        return address(p);
    }

    function _createBankNodeStakingPoolTokenClone(
        string memory name,
        string memory symbol,
        uint8 decimalsValue,
        address minterAdmin,
        address minter
    ) private returns (address) {
        BeaconProxy p = new BeaconProxy(
            address(protocolConfig.upBeaconBankNodeStakingPool()),
            abi.encodeWithSelector(
                ITokenInitializableV1.initialize.selector,
                //initialize(string calldata name, string calldata symbol, uint8 decimalsValue, address minterAdmin, address minter) external;
                name,
                symbol,
                decimalsValue,
                minterAdmin,
                minter
            )
        );
        return address(p);
    }

    function _createBankNodeContracts(
        uint32 bankNodeId,
        address operatorAdmin,
        address operator,
        uint256 tokensToBond,
        address lendableTokenAddress
    )
        private
        returns (
            address bankNodeContract,
            address bankNodeToken,
            address bnplStakingPoolContract,
            address bnplStakingPoolToken
        )
    {
        require(lendableTokenAddress != address(0), "lendableTokenAddress cannot be 0");
        LendableToken memory lendableToken = lendableTokens[lendableTokenAddress];
        require(
            lendableToken.tokenContract == lendableTokenAddress && lendableToken.valueMultiplier > 0,
            "invalid lendable token"
        );
        require(enabledLendableTokens[lendableTokenAddress] == 1, "lendable token not enabled");
        bankNodeContract = address(new BeaconProxy(address(protocolConfig.upBeaconBankNode()), ""));
        bnplStakingPoolContract = address(new BeaconProxy(address(protocolConfig.upBeaconBankNodeStakingPool()), ""));

        bnplStakingPoolToken = _createBankNodeLendingPoolTokenClone(
            "Banking Node Pool BNPL",
            "pBNPL",
            lendableToken.decimals,
            address(0),
            bnplStakingPoolContract
        );

        TransferHelper.safeTransferFrom(address(bnplToken), msg.sender, bnplStakingPoolContract, tokensToBond);

        IBNPLNodeStakingPool(bnplStakingPoolContract).initialize(
            address(bnplToken),
            bnplStakingPoolToken,
            bankNodeContract,
            msg.sender,
            tokensToBond
        );

        bankNodeToken = _createBankNodeLendingPoolTokenClone(
            lendableToken.poolSymbol,
            lendableToken.poolSymbol,
            18,
            address(0),
            bankNodeContract
        );

        IBankNodeInitializableV1(bankNodeContract).initialize(
            IBankNodeInitializableV1.BankNodeInitializeArgsV1({
                bankNodeId: bankNodeId,
                bnplSwapMarketPoolFee: lendableToken.swapMarketPoolFee,
                bankNodeManager: address(this),
                operatorAdmin: operatorAdmin,
                operator: operator,
                bnplToken: address(bnplToken),
                bnplSwapMarket: lendableToken.swapMarket,
                unusedFundsLendingMode: lendableToken.unusedFundsLendingMode,
                unusedFundsLendingContract: lendableToken.unusedFundsLendingContract,
                unusedFundsLendingToken: lendableToken.unusedFundsLendingToken,
                nodeStakingPool: bnplStakingPoolContract,
                baseLiquidityToken: lendableToken.tokenContract,
                poolLiquidityToken: bankNodeToken
            })
        );
    }

    function createBondedBankNode(
        address operator,
        uint256 tokensToBond,
        address lendableTokenAddress,
        string calldata nodeName,
        string calldata website
    ) public override nonReentrant returns (uint256) {
        require(tokensToBond >= minimumBankNodeBondedAmount && tokensToBond > 0, "Not enough tokens bonded");
        require(operator != address(0), "operator cannot be 0");
        require(lendableTokenAddress != address(0), "lendableTokenAddress cannot be 0");

        bankNodeCount = bankNodeCount + 1;
        uint32 bankNodeId = bankNodeCount;

        (
            address bankNodeContract,
            address bankNodeToken,
            address bnplStakingPoolContract,
            address bnplStakingPoolToken
        ) = _createBankNodeContracts(bankNodeId, operator, operator, tokensToBond, lendableTokenAddress);

        BankNode storage bankNode = bankNodes[bankNodeId];
        bankNodeAddressToId[bankNodeContract] = bankNodeId;

        bankNode.bankNodeContract = bankNodeContract;
        bankNode.bankNodeToken = bankNodeToken;

        bankNode.bnplStakingPoolContract = bnplStakingPoolContract;
        bankNode.bnplStakingPoolToken = bnplStakingPoolToken;

        bankNode.lendableToken = lendableTokenAddress;
        bankNode.creator = msg.sender;

        bankNode.id = bankNodeId;
        bankNode.createdAt = uint64(block.timestamp);

        bankNode.nodeName = nodeName;
        bankNode.website = website;

        return bankNodeId;
    }
}
