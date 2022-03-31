// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract Air is ERC20, ERC20Burnable {

    constructor(
        uint256 supply,
        string memory description,
        string memory ticker
    ) ERC20(description, ticker) {
        _mint(msg.sender, supply);
    }

    function mint(address receiver, uint256 amount) public {
        // require(owner == msg.sender, "Only admin can mint tokens");
        _mint(receiver, amount);
    }
}
