// Unit tests for the wallet-signature primitives that anchor the W1 #2 fix
// (signed-nonce challenge auth). Pure crypto — no DB, no network: the
// BlockchainService constructor is inert until initialize() is called.

import { ethers } from "ethers";
import blockchainService from "../services/blockchainService.js";

describe("blockchainService.generateChallengeMessage", () => {
  it("binds the address into the message and returns a fresh 32-byte nonce", () => {
    const addr = "0xAbC0000000000000000000000000000000000001";
    const { message, nonce } = blockchainService.generateChallengeMessage(addr);

    expect(message).toContain(addr.toLowerCase());
    expect(message).toContain("Healthmint authentication");
    expect(nonce).toMatch(/^[0-9a-f]{64}$/); // 32 bytes hex
  });

  it("produces a unique nonce per call", () => {
    const a = blockchainService.generateChallengeMessage("0x01");
    const b = blockchainService.generateChallengeMessage("0x01");
    expect(a.nonce).not.toEqual(b.nonce);
  });

  it("rejects a missing address", () => {
    expect(() => blockchainService.generateChallengeMessage()).toThrow();
  });
});

describe("blockchainService.verifySignature", () => {
  it("accepts a signature that recovers to the claimed address", async () => {
    const wallet = ethers.Wallet.createRandom();
    const { message } = blockchainService.generateChallengeMessage(wallet.address);
    const signature = await wallet.signMessage(message);

    expect(blockchainService.verifySignature(message, signature, wallet.address)).toBe(
      true
    );
  });

  it("rejects a signature from a different wallet", async () => {
    const signer = ethers.Wallet.createRandom();
    const someoneElse = ethers.Wallet.createRandom();
    const { message } = blockchainService.generateChallengeMessage(signer.address);
    const signature = await signer.signMessage(message);

    expect(
      blockchainService.verifySignature(message, signature, someoneElse.address)
    ).toBe(false);
  });

  it("rejects a tampered message", async () => {
    const wallet = ethers.Wallet.createRandom();
    const { message } = blockchainService.generateChallengeMessage(wallet.address);
    const signature = await wallet.signMessage(message);

    expect(
      blockchainService.verifySignature(message + "tampered", signature, wallet.address)
    ).toBe(false);
  });

  it("returns false (does not throw) on malformed input", () => {
    expect(blockchainService.verifySignature(null, null, null)).toBe(false);
    expect(blockchainService.verifySignature("m", "not-a-sig", "0x01")).toBe(false);
  });
});
