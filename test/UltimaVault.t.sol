// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../contracts/UltimaVault.sol";
import "./mocks/MockUSDC.sol";

interface Vm {
    function prank(address) external;
    function startPrank(address) external;
    function stopPrank() external;
    function expectRevert(bytes calldata) external;
}

contract UltimaVaultTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    MockUSDC private token;
    UltimaVault private vault;
    address private alice = address(0xA11CE);
    address private bob = address(0xB0B);

    function setUp() public {
        token = new MockUSDC();
        vault = new UltimaVault(address(token));
        token.mint(alice, 100e6);
        token.mint(bob, 100e6);
        vm.startPrank(alice);
        token.approve(address(vault), type(uint256).max);
        vm.stopPrank();
        vm.startPrank(bob);
        token.approve(address(vault), type(uint256).max);
        vm.stopPrank();
    }

    function testDepositCreditsOnlyDepositor() public {
        vm.prank(alice);
        vault.deposit(25e6);
        require(vault.balanceOf(alice) == 25e6, "alice balance");
        require(vault.balanceOf(bob) == 0, "bob balance");
        require(vault.totalAccounted() == 25e6, "accounted");
        require(vault.totalAssets() == 25e6, "custody");
    }

    function testRejectZeroDeposit() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("ZeroAmount()"));
        vault.deposit(0);
    }

    function testWithdrawReturnsFundsAndUpdatesAccounting() public {
        vm.startPrank(alice);
        vault.deposit(30e6);
        vault.withdraw(12e6);
        vm.stopPrank();
        require(token.balanceOf(alice) == 82e6, "alice token balance");
        require(vault.balanceOf(alice) == 18e6, "alice vault balance");
        require(vault.totalAccounted() == 18e6, "accounted");
    }

    function testRejectZeroWithdrawal() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("ZeroAmount()"));
        vault.withdraw(0);
    }

    function testCannotWithdrawMoreThanOwnBalance() public {
        vm.prank(alice);
        vault.deposit(10e6);
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSignature("InsufficientBalance()"));
        vault.withdraw(1);
    }

    function testCannotWithdrawAnotherUsersBalance() public {
        vm.prank(alice);
        vault.deposit(20e6);
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSignature("InsufficientBalance()"));
        vault.withdraw(1);
        require(vault.balanceOf(alice) == 20e6, "alice funds unchanged");
    }

    function testPauseBlocksDepositsButNotWithdrawals() public {
        vm.prank(alice);
        vault.deposit(10e6);
        vault.pauseDeposits();
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSignature("DepositsPaused()"));
        vault.deposit(1e6);
        vm.prank(alice);
        vault.withdraw(10e6);
        require(vault.balanceOf(alice) == 0, "withdraw while paused");
    }

    function testOnlyOwnerCanPause() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("NotOwner()"));
        vault.pauseDeposits();
    }

    function testOwnerCanUnpause() public {
        vault.pauseDeposits();
        vault.unpauseDeposits();
        require(!vault.depositsPaused(), "should be unpaused");
        vm.prank(alice);
        vault.deposit(1e6);
        require(vault.balanceOf(alice) == 1e6, "deposit after unpause");
    }

    function testOwnershipTransfer() public {
        vault.transferOwnership(bob);
        require(vault.owner() == bob, "owner changed");
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("NotOwner()"));
        vault.pauseDeposits();
        vm.prank(bob);
        vault.pauseDeposits();
    }
}
