// Reentrancy test for purchaseData() — the W3 case the plan explicitly flags
// as easy to get silently wrong.
//
// The vector is the overpayment refund: purchaseData() pays the seller, grants
// access, then refunds excess to msg.sender via `.call`. ReentrancyAttacker
// overpays and re-enters from its receive() with enough value to pass the
// payment check, so the nonReentrant modifier is the only thing that can stop
// it. We assert (a) the attack reverts and (b) the attacker never gained
// access — and, as a control, that an honest overpaying buyer DOES succeed, so
// a green result can't come from a setup that simply reverts everything.

const HealthDataMarketplace = artifacts.require("HealthDataMarketplace");
const ReentrancyAttacker = artifacts.require("ReentrancyAttacker");

const MIN_RETENTION = 180 * 24 * 60 * 60;

async function expectRevert(promise) {
  try {
    await promise;
  } catch (err) {
    return err;
  }
  assert.fail("Expected transaction to revert, but it succeeded");
}

contract("HealthDataMarketplace — reentrancy on purchaseData", (accounts) => {
  const [admin, seller, honestBuyer, attackerOwner] = accounts;
  const price = web3.utils.toWei("1", "ether");

  let market;

  beforeEach(async () => {
    market = await HealthDataMarketplace.new({ from: admin });
    await market.registerUser("patient", "enc-seller", { from: seller });
    await market.listHealthData("ipfs://cid-1", price, "genomics", MIN_RETENTION, false, {
      from: seller,
    });
  });

  it("blocks a re-entrant purchaseData() call via the refund hook", async () => {
    const attacker = await ReentrancyAttacker.new(market.address, {
      from: attackerOwner,
    });
    await attacker.register({ from: attackerOwner });

    // Overpay 2x so the contract issues a 1 ETH refund -> reentrancy window.
    await expectRevert(
      attacker.attack(1, {
        from: attackerOwner,
        value: web3.utils.toWei("2", "ether"),
      })
    );

    // The attack must have changed nothing: no access for the attacker.
    const access = await market.checkAccess(1, attacker.address);
    assert.equal(
      access.hasAccess,
      false,
      "attacker must not hold access after a blocked reentrancy attempt"
    );
  });

  it("control: an honest overpaying buyer still succeeds (proves the revert is the guard, not a broken fixture)", async () => {
    await market.registerUser("researcher", "enc-buyer", { from: honestBuyer });

    await market.purchaseData(1, "research", {
      from: honestBuyer,
      value: web3.utils.toWei("2", "ether"), // same overpayment shape as the attack
    });

    const access = await market.checkAccess(1, honestBuyer);
    assert.equal(
      access.hasAccess,
      true,
      "an honest buyer using the same overpayment path must succeed"
    );
  });
});
