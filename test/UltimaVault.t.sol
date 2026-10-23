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
    MockUSDC private usdc;
    MockUSDC private eurc;
    UltimaVault private vault;
    address private alice = address(0xA11CE);
    address private bob = address(0xB0B);
    address private strangerToken = address(0xBAD);

    function setUp() public {
        usdc = new MockUSDC();
        eurc = new MockUSDC();
        vault = new UltimaVault(address(usdc), address(eurc));
        usdc.mint(alice, 100e6);
        usdc.mint(bob, 100e6);
        eurc.mint(alice, 100e6);
        eurc.mint(bob, 100e6);
        vm.startPrank(alice);
        usdc.approve(address(vault), type(uint256).max);
        eurc.approve(address(vault), type(uint256).max);
        vm.stopPrank();
        vm.startPrank(bob);
        usdc.approve(address(vault), type(uint256).max);
        eurc.approve(address(vault), type(uint256).max);
        vm.stopPrank();
    }

    function testDepositCreditsOnlyDepositorForUSDC() public {
        vm.prank(alice);
        vault.deposit(address(usdc), 25e6);
        require(vault.balanceOf(address(usdc), alice) == 25e6, "alice USDC");
        require(vault.balanceOf(address(eurc), alice) == 0, "alice EURC unchanged");
        require(vault.totalAccounted(address(usdc)) == 25e6, "USDC accounted");
        require(vault.totalAssets(address(usdc)) == 25e6, "USDC custody");
    }

    function testDepositAndWithdrawEURCIndependently() public {
        vm.startPrank(alice);
        vault.deposit(address(eurc), 40e6);
        vault.withdraw(address(eurc), 15e6);
        vm.stopPrank();
        require(eurc.balanceOf(alice) == 75e6, "alice EURC returned");
        require(vault.balanceOf(address(eurc), alice) == 25e6, "EURC balance");
        require(vault.balanceOf(address(usdc), alice) == 0, "USDC untouched");
        require(vault.totalAccounted(address(eurc)) == 25e6, "EURC accounted");
    }

    function testBothAssetsHaveIndependentUserBalances() public {
        vm.startPrank(alice);
        vault.deposit(address(usdc), 10e6);
        vault.deposit(address(eurc), 20e6);
        vm.stopPrank();
        require(vault.balanceOf(address(usdc), alice) == 10e6, "USDC balance");
        require(vault.balanceOf(address(eurc), alice) == 20e6, "EURC balance");
    }

    function testRejectUnsupportedAsset() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("UnsupportedAsset()"));
        vault.deposit(strangerToken, 1e6);
    }

    function testRejectZeroDeposit() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("ZeroAmount()"));
        vault.deposit(address(usdc), 0);
    }

    function testWithdrawReturnsUSDCAndUpdatesAccounting() public {
        vm.startPrank(alice);
        vault.deposit(address(usdc), 30e6);
        vault.withdraw(address(usdc), 12e6);
        vm.stopPrank();
        require(usdc.balanceOf(alice) == 82e6, "alice USDC returned");
        require(vault.balanceOf(address(usdc), alice) == 18e6, "vault balance");
        require(vault.totalAccounted(address(usdc)) == 18e6, "accounted");
    }

    function testRejectZeroWithdrawal() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("ZeroAmount()"));
        vault.withdraw(address(usdc), 0);
    }

    function testCannotWithdrawMoreThanOwnBalance() public {
        vm.prank(alice);
        vault.deposit(address(usdc), 10e6);
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSignature("InsufficientBalance()"));
        vault.withdraw(address(usdc), 1);
    }

    function testCannotWithdrawAnotherUsersBalance() public {
        vm.prank(alice);
        vault.deposit(address(usdc), 20e6);
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSignature("InsufficientBalance()"));
        vault.withdraw(address(usdc), 1);
        require(vault.balanceOf(address(usdc), alice) == 20e6, "alice funds unchanged");
    }

    function testPauseBlocksDepositsButNotWithdrawals() public {
        vm.prank(alice);
        vault.deposit(address(usdc), 10e6);
        vault.pauseDeposits();
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSignature("DepositsPaused()"));
        vault.deposit(address(eurc), 1e6);
        vm.prank(alice);
        vault.withdraw(address(usdc), 10e6);
        require(vault.balanceOf(address(usdc), alice) == 0, "withdraw while paused");
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
        vault.deposit(address(usdc), 1e6);
        require(vault.balanceOf(address(usdc), alice) == 1e6, "deposit after unpause");
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
