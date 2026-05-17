// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IMarket {
    function registerUser(
        string calldata role,
        string calldata details
    ) external;

    function purchaseData(
        uint256 id,
        string calldata purpose
    ) external payable;
}

// Malicious buyer used by HealthDataMarketplace.reentrancy.test.js.
//
// purchaseData() refunds any overpayment to msg.sender via a low-level
// .call before the function returns. That refund is the reentrancy window:
// this contract overpays, and when the refund hits receive() it calls
// purchaseData() again with enough value to clear the payment check — so the
// ONLY thing that can stop the re-entry is the nonReentrant guard. The
// re-entrant call is deliberately NOT wrapped in try/catch: if the guard is
// absent the attack proceeds; if present, the revert propagates and the whole
// purchase unwinds. Either way the test can tell the difference.
contract ReentrancyAttacker {
    IMarket public market;
    uint256 public targetId;
    bool public reentered;

    constructor(address _market) {
        market = IMarket(_market);
    }

    function register() external {
        market.registerUser("researcher", "enc-attacker");
    }

    function attack(uint256 id) external payable {
        targetId = id;
        market.purchaseData{value: msg.value}(id, "attack");
    }

    receive() external payable {
        if (!reentered) {
            reentered = true;
            market.purchaseData{value: address(this).balance}(
                targetId,
                "reenter"
            );
        }
    }
}
