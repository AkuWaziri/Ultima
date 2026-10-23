// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal ERC-20 interface used by UltimaVault.
interface IERC20Minimal {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

/// @title UltimaVault
/// @notice USDC and EURC custody/accounting for Ultima; does not generate yield.
/// @dev Both assets are configured at deployment. Withdrawals remain enabled while deposits are paused.
contract UltimaVault {
    error ZeroAddress();
    error ZeroAmount();
    error NotOwner();
    error UnsupportedAsset();
    error DepositsPaused();
    error InsufficientBalance();
    error TokenTransferFailed();
    error ReentrantCall();

    IERC20Minimal public immutable usdc;
    IERC20Minimal public immutable eurc;
    address public owner;
    bool public depositsPaused;
    uint256 private _entered = 1;

    mapping(address asset => mapping(address account => uint256)) public balanceOf;
    mapping(address asset => uint256) public totalAccounted;

    event Deposited(address indexed asset, address indexed account, uint256 amount);
    event Withdrawn(address indexed asset, address indexed account, uint256 amount);
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

    constructor(address usdcAddress, address eurcAddress) {
        if (usdcAddress == address(0) || eurcAddress == address(0)) revert ZeroAddress();
        if (usdcAddress == eurcAddress) revert UnsupportedAsset();
        usdc = IERC20Minimal(usdcAddress);
        eurc = IERC20Minimal(eurcAddress);
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function isSupportedAsset(address asset) public view returns (bool) {
        return asset == address(usdc) || asset == address(eurc);
    }

    function deposit(address asset, uint256 amount) external nonReentrant {
        if (!isSupportedAsset(asset)) revert UnsupportedAsset();
        if (depositsPaused) revert DepositsPaused();
        if (amount == 0) revert ZeroAmount();

        IERC20Minimal token = IERC20Minimal(asset);
        uint256 beforeBalance = token.balanceOf(address(this));
        _safeTransferFrom(token, msg.sender, address(this), amount);
        uint256 received = token.balanceOf(address(this)) - beforeBalance;
        if (received != amount) revert TokenTransferFailed();

        balanceOf[asset][msg.sender] += amount;
        totalAccounted[asset] += amount;
        emit Deposited(asset, msg.sender, amount);
    }

    function withdraw(address asset, uint256 amount) external nonReentrant {
        if (!isSupportedAsset(asset)) revert UnsupportedAsset();
        if (amount == 0) revert ZeroAmount();
        uint256 userBalance = balanceOf[asset][msg.sender];
        if (amount > userBalance) revert InsufficientBalance();

        balanceOf[asset][msg.sender] = userBalance - amount;
        totalAccounted[asset] -= amount;
        _safeTransfer(IERC20Minimal(asset), msg.sender, amount);
        emit Withdrawn(asset, msg.sender, amount);
    }

    function totalAssets(address asset) external view returns (uint256) {
        if (!isSupportedAsset(asset)) revert UnsupportedAsset();
        return IERC20Minimal(asset).balanceOf(address(this));
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

    function _safeTransfer(IERC20Minimal token, address to, uint256 amount) private {
        (bool ok, bytes memory data) = address(token).call(
            abi.encodeWithSelector(IERC20Minimal.transfer.selector, to, amount)
        );
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TokenTransferFailed();
    }

    function _safeTransferFrom(IERC20Minimal token, address from, address to, uint256 amount) private {
        (bool ok, bytes memory data) = address(token).call(
            abi.encodeWithSelector(IERC20Minimal.transferFrom.selector, from, to, amount)
        );
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TokenTransferFailed();
    }
}
