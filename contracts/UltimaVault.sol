// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal ERC-20 interface used by UltimaVault.
interface IERC20Minimal {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

/// @title UltimaVault
/// @notice Non-yield-generating USDC custody/accounting primitive for Ultima.
/// @dev This contract does not invest assets or promise yield. Withdrawals remain enabled while paused.
contract UltimaVault {
    error ZeroAddress();
    error ZeroAmount();
    error NotOwner();
    error DepositsPaused();
    error InsufficientBalance();
    error TokenTransferFailed();
    error ReentrantCall();

    IERC20Minimal public immutable asset;
    address public owner;
    bool public depositsPaused;
    uint256 private _entered = 1;

    mapping(address => uint256) public balanceOf;
    uint256 public totalAccounted;

    event Deposited(address indexed account, uint256 amount);
    event Withdrawn(address indexed account, uint256 amount);
    event DepositsPausedChanged(bool paused);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier nonReentrant() {
        if (_entered != 1) revert ReentrantCall();
        _entered = 2;
        _;
        _entered = 1;
    }

    constructor(address assetAddress) {
        if (assetAddress == address(0)) revert ZeroAddress();
        asset = IERC20Minimal(assetAddress);
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function deposit(uint256 amount) external nonReentrant {
        if (depositsPaused) revert DepositsPaused();
        if (amount == 0) revert ZeroAmount();

        uint256 beforeBalance = asset.balanceOf(address(this));
        _safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = asset.balanceOf(address(this)) - beforeBalance;
        // Fee-on-transfer assets are not supported: credited amount must equal requested amount.
        if (received != amount) revert TokenTransferFailed();

        balanceOf[msg.sender] += amount;
        totalAccounted += amount;
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        uint256 userBalance = balanceOf[msg.sender];
        if (amount > userBalance) revert InsufficientBalance();

        // Effects before interaction; a revert in transfer restores state.
        balanceOf[msg.sender] = userBalance - amount;
        totalAccounted -= amount;
        _safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function pauseDeposits() external onlyOwner {
        depositsPaused = true;
        emit DepositsPausedChanged(true);
    }

    function unpauseDeposits() external onlyOwner {
        depositsPaused = false;
        emit DepositsPausedChanged(false);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address previous = owner;
        owner = newOwner;
        emit OwnershipTransferred(previous, newOwner);
    }

    /// @notice Actual token custody. Should be equal to totalAccounted for the supported standard token.
    function totalAssets() external view returns (uint256) {
        return asset.balanceOf(address(this));
    }

    function _safeTransfer(address to, uint256 amount) private {
        (bool ok, bytes memory data) = address(asset).call(
            abi.encodeWithSelector(IERC20Minimal.transfer.selector, to, amount)
        );
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TokenTransferFailed();
    }

    function _safeTransferFrom(address from, address to, uint256 amount) private {
        (bool ok, bytes memory data) = address(asset).call(
            abi.encodeWithSelector(IERC20Minimal.transferFrom.selector, from, to, amount)
        );
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TokenTransferFailed();
    }
}
