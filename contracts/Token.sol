// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.14;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Token is ERC20 {
    constructor() ERC20("ATRAC", "ATRAC") {
        _mint(msg.sender, 100000000 * 10**18);
    }
}
