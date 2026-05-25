// Truffle suite for HealthDataMarketplace.
//
// Scope is the W3 "minimum, visibly-tested" footprint, not coverage chasing:
// a happy path, the critical access-control / refund / paused branches, and
// the W1 #1 regression that proves `encryptionKey` is gone from chain state.
// Reentrancy lives in its own file (ReentrancyAttacker).

const HealthDataMarketplace = artifacts.require("HealthDataMarketplace");

const MIN_RETENTION = 180 * 24 * 60 * 60; // 180 days, the contract minimum

// Minimal revert assertion so we don't pull in truffle-assertions.
async function expectRevert(promise, msgSubstring) {
  try {
    await promise;
  } catch (err) {
    if (msgSubstring) {
      assert(
        err.message.includes(msgSubstring),
        `Expected revert containing "${msgSubstring}", got: ${err.message}`
      );
    }
    return;
  }
  assert.fail("Expected transaction to revert, but it succeeded");
}

contract("HealthDataMarketplace", (accounts) => {
  const [admin, seller, buyer, stranger] = accounts;
  const price = web3.utils.toWei("1", "ether");

  let market;

  beforeEach(async () => {
    // Fresh deployment per test so state never leaks between cases.
    market = await HealthDataMarketplace.new({ from: admin });
    await market.registerUser("patient", "enc-seller", { from: seller });
    await market.registerUser("researcher", "enc-buyer", { from: buyer });
  });

  async function listOne(from = seller) {
    await market.listHealthData(
      "ipfs://cid-1",
      price,
      "genomics",
      MIN_RETENTION,
      false,
      {
        from,
      }
    );
    return 1; // first data id (counter starts at 1)
  }

  describe("happy path", () => {
    it("registers users, lists data, and splits payment on purchase", async () => {
      const id = await listOne();

      const sellerBefore = web3.utils.toBN(await web3.eth.getBalance(seller));
      await market.purchaseData(id, "research", { from: buyer, value: price });
      const sellerAfter = web3.utils.toBN(await web3.eth.getBalance(seller));

      // platformFee = 250 (2.5%). Seller receives price - 2.5%.
      const expectedSellerGain = web3.utils
        .toBN(price)
        .mul(web3.utils.toBN(9750))
        .div(web3.utils.toBN(10000));
      assert.equal(
        sellerAfter.sub(sellerBefore).toString(),
        expectedSellerGain.toString(),
        "seller should receive price minus the 2.5% platform fee"
      );

      // Buyer now has (unexpired) access.
      const access = await market.checkAccess(id, buyer);
      assert.equal(
        access.hasAccess,
        true,
        "buyer should have access post-purchase"
      );
    });
  });

  describe("access control", () => {
    it("rejects pause() from a non-admin", async () => {
      await expectRevert(market.pause({ from: stranger }));
    });

    it("rejects verifyData() from a non-verifier", async () => {
      const id = await listOne();
      await expectRevert(
        market.verifyData(id, true, { from: stranger }),
        "Not a verifier"
      );
    });

    it("rejects getAuditTrail() for a non-owner / non-admin", async () => {
      const id = await listOne();
      await expectRevert(
        market.getAuditTrail(id, { from: stranger }),
        "Not authorized"
      );
    });

    it("rejects listHealthData() from an unregistered account", async () => {
      await expectRevert(
        market.listHealthData("ipfs://x", price, "cat", MIN_RETENTION, false, {
          from: stranger,
        }),
        "User not registered"
      );
    });
  });

  describe("refund path", () => {
    it("refunds overpayment back to the buyer", async () => {
      const id = await listOne();
      const overpay = web3.utils.toWei("1.5", "ether"); // 0.5 ETH excess

      const before = web3.utils.toBN(await web3.eth.getBalance(buyer));
      const receipt = await market.purchaseData(id, "research", {
        from: buyer,
        value: overpay,
      });
      const after = web3.utils.toBN(await web3.eth.getBalance(buyer));

      const tx = await web3.eth.getTransaction(receipt.tx);
      const gasCost = web3.utils
        .toBN(receipt.receipt.gasUsed)
        .mul(web3.utils.toBN(tx.gasPrice));

      // Net cost to buyer should be exactly `price` + gas (the 0.5 ETH excess
      // was refunded), not the full 1.5 ETH sent.
      const netSpent = before.sub(after).sub(gasCost);
      assert.equal(
        netSpent.toString(),
        price.toString(),
        "buyer should only be out the listing price; excess refunded"
      );
    });
  });

  describe("paused state", () => {
    it("rejects purchaseData() while paused", async () => {
      const id = await listOne();
      await market.pause({ from: admin });
      await expectRevert(
        market.purchaseData(id, "research", { from: buyer, value: price }),
        "Pausable: paused"
      );
    });
  });

  describe("W1 #1 regression — no on-chain encryption key", () => {
    it("listHealthData ABI takes 5 args and none is an encryption key", () => {
      const fn = HealthDataMarketplace.abi.find(
        (e) => e.type === "function" && e.name === "listHealthData"
      );
      assert.ok(fn, "listHealthData should exist");
      assert.equal(
        fn.inputs.length,
        5,
        "listHealthData must not take an _encryptionKey arg"
      );
      const names = fn.inputs.map((i) => i.name.toLowerCase());
      assert.ok(
        !names.some((n) => n.includes("encryptionkey") || n.includes("key")),
        `no key parameter expected, got: ${names.join(", ")}`
      );
    });

    it("the public healthData getter exposes no encryptionKey field", async () => {
      const id = await listOne();
      const record = await market.healthData(id);
      assert.equal(
        record.encryptionKey,
        undefined,
        "healthData getter must not return an encryptionKey"
      );
      assert.equal(record.encryptedDataHash, "ipfs://cid-1");
    });
  });
});
