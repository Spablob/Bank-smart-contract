// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.14;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Pool is Ownable, ReentrancyGuard {
    //=========== DEPENDENCIES ============

    using SafeERC20 for IERC20;

    //============ INTERFACES =============

    IERC20 public tokenInterface;

    //============ VARIABLES ==============

    mapping(address => uint256) public stakedAmount;

    uint256 public T;
    uint256 public R1Balance;
    uint256 public R2Balance;
    uint256 public R3Balance;
    uint256 public poolBalance;
    uint256 public deploymentTime;
    uint256 public totalStakedAmount;
    uint256 public withdrawAmount;
    bool public ownerHasDeposited = false;

    //=========== CONSTRUCTOR =============

    constructor(uint256 _timeConstant, address _tokenAddress) {
        tokenInterface = IERC20(_tokenAddress);
        T = _timeConstant;
        deploymentTime = block.timestamp;
    }

    //============ FUNCTIONS ==============

    function ownerDeposit(uint256 _amount) external nonReentrant onlyOwner {
        require(ownerHasDeposited == false, "The owner can only deposit the rewards once");
        require(_amount > 0, "Amount must be more than 0");
        // R1Balance = divider(20, 100, 0) * _amount;
        R1Balance = (_amount * 2) / 10;
        R2Balance = (_amount * 3) / 10;
        R3Balance = (_amount * 5) / 10;
        poolBalance = _amount;
        tokenInterface.safeTransferFrom(msg.sender, address(this), _amount);
        ownerHasDeposited = true;
    }

    function stake(uint256 _amount) public nonReentrant {
        require(
            ownerHasDeposited == true,
            "The user is protected from staking before the pool rewards have been deposited by the owner"
        );
        require(_amount > 0, "Amount must be more than 0");
        require(block.timestamp <= (deploymentTime + T), "User can only stake during the deposit period");
        totalStakedAmount += _amount;
        stakedAmount[msg.sender] += _amount;
        tokenInterface.safeTransferFrom(msg.sender, address(this), _amount);
    }

    function withdraw() public nonReentrant {
        require(block.timestamp > (deploymentTime + 2 * T), "It is not possible to withdraw before 2T"); // (1) locking period is just from T to 2T; (2) users need to wait at least T since deposit to withdraw; (1+2) The resulting condition means that users can't withdraw before 2T

        if (block.timestamp <= (deploymentTime + 3 * T)) {
            withdrawAmount = (((stakedAmount[msg.sender] * 10) / totalStakedAmount) * R1Balance) / 10;
            poolBalance -= withdrawAmount;
        } else if (block.timestamp > (deploymentTime + 3 * T) && block.timestamp <= (deploymentTime + 4 * T)) {
            withdrawAmount = (((stakedAmount[msg.sender] * 10) / totalStakedAmount) * (poolBalance - R3Balance)) / 10;
            poolBalance -= withdrawAmount;
        } else if (block.timestamp > (deploymentTime + 4 * T)) {
            withdrawAmount = (((stakedAmount[msg.sender] * 10) / totalStakedAmount) * (poolBalance)) / 10;
            poolBalance -= withdrawAmount;
        }

        tokenInterface.safeTransfer(msg.sender, withdrawAmount + stakedAmount[msg.sender]);
        totalStakedAmount -= stakedAmount[msg.sender];
        stakedAmount[msg.sender] = 0;
    }

    function ownerWithdraw() public nonReentrant onlyOwner {
        require(
            block.timestamp > (deploymentTime + 4 * T) && (poolBalance - R3Balance == 0),
            "The owner can only withdraw if all users unstake before 4T"
        );
        tokenInterface.safeTransfer(msg.sender, tokenInterface.balanceOf(address(this)));
    }
}
