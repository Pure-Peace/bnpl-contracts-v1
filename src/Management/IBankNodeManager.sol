// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../ProtocolDeploy/IBNPLProtocolConfig.sol";

interface IBankNodeManager {
    struct LendableToken {
        address tokenContract;

        address swapMarket;
        uint24 swapMarketPoolFee;

        uint8 decimals;
        uint256 valueMultiplier; //USD_VALUE = amount * valueMultiplier / 10**18

        uint16 unusedFundsLendingMode;
        address unusedFundsLendingContract;
        address unusedFundsLendingToken;

        string symbol;
        string poolSymbol;
    }

    struct BankNode {
        address bankNodeContract;
        address bankNodeToken;

        address bnplStakingPoolContract;
        address bnplStakingPoolToken;

        address lendableToken;
        address creator;
        
        uint32 id;
        uint64 createdAt;

        string nodeName;
        string website;
    }



    struct CreateBankNodeContractsInput {
        uint32 bankNodeId;
        address operatorAdmin;
        address operator;
        address lendableTokenAddress;
    }
    struct CreateBankNodeContractsOutput {
        address bankNodeContract;
        address bankNodeToken;
        address bnplStakingPoolContract;
        address bnplStakingPoolToken;
    }

    
    function initialize(IBNPLProtocolConfig _protocolConfig, address _configurator, uint256 _minimumBankNodeBondedAmount) external;

    function enabledLendableTokens(address lendableTokenAddress) external view returns(uint8);
    function lendableTokens(address lendableTokenAddress) external view returns(
        address tokenContract,

        address swapMarket,
        uint24 swapMarketPoolFee,

        uint8 decimals,
        uint256 valueMultiplier, //USD_VALUE = amount * valueMultiplier / 10**18

        uint16 unusedFundsLendingMode,
        address unusedFundsLendingContract,
        address unusedFundsLendingToken,

        string calldata symbol,
        string calldata poolSymbol
    );
    function bankNodes(uint32 bankNodeId) external view returns(
        address bankNodeContract,
        address bankNodeToken,

        address bnplStakingPoolContract,
        address bnplStakingPoolToken,

        address lendableToken,
        address creator,
        
        uint32 id,
        uint64 createdAt,

        string calldata nodeName,
        string calldata website
    );
    function bankNodeAddressToId(address bankNodeAddressTo) external view returns(uint32);
    

    function minimumBankNodeBondedAmount() external view returns (uint256);
    function bankNodeCount() external view returns (uint32);
    function bnplToken() external view returns (IERC20);

    function upBeaconBankNode() external view returns (address);
    function upBeaconBankNodeLendingPoolToken() external view returns (address);

    function upBeaconBankNodeStakingPool() external view returns (address);
    function upBeaconBankNodeStakingPoolToken() external view returns (address);

    function protocolConfig() external view returns (IBNPLProtocolConfig);




}