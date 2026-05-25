// src/hooks/useWalletConnect.test.js
//
// Item 8.2 — tests for wallet connect/disconnect happy path + error paths.
// Strategy: mock window.ethereum and ethers; use a real RTK store so Redux
// state changes are reflected in the hook's return values.
//
// Notes on test isolation:
// - window.ethereum must remain defined throughout each test, including during
//   React cleanup (the hook's useEffect cleanup calls removeListener). We keep a
//   stable ethereum stub in beforeEach and never delete it in afterEach.
// - The ethers mock factory must be self-contained (no hoisted variable refs)
//   because jest.mock is hoisted before variable declarations by babel-jest.

import { renderHook, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import React from "react";

import useWalletConnect from "./useWalletConnect";
import walletReducer from "../redux/slices/walletSlice";
import userReducer from "../redux/slices/userSlice";
import notificationReducer from "../redux/slices/notificationSlice";

// ── ethers mock ──────────────────────────────────────────────────────────────
// Use plain functions (not jest.fn) to avoid clearAllMocks interactions.
// __esModule: true tells Babel's interop that this is already an ES module
// shape, so named imports work correctly without re-wrapping.
jest.mock("ethers", () => ({
  __esModule: true,
  ethers: {
    providers: {
      Web3Provider: function MockWeb3Provider() {
        return {
          getNetwork: () => Promise.resolve({ chainId: 11155111 }), // Sepolia
          getBalance: () => Promise.resolve({ toString: () => "42000000000000000" }),
        };
      },
    },
    utils: {
      formatEther: () => "0.042",
    },
  },
}));

// ── helpers ──────────────────────────────────────────────────────────────────

const MOCK_ADDRESS = "0xabc123def456abc123def456abc123def456abc1";

// Build a minimal ethereum stub. Tests override specific methods as needed.
// Always include removeListener so the hook's cleanup effect never throws.
const makeEthereum = (overrides = {}) => ({
  isMetaMask: true,
  on: jest.fn(),
  removeListener: jest.fn(),
  request: jest.fn(({ method }) => {
    if (method === "eth_requestAccounts") return Promise.resolve([MOCK_ADDRESS]);
    if (method === "eth_accounts") return Promise.resolve([MOCK_ADDRESS]);
    if (method === "eth_chainId") return Promise.resolve("0xaa36a7"); // Sepolia
    return Promise.resolve(null);
  }),
  ...overrides,
});

const makeStore = (walletOverrides = {}) =>
  configureStore({
    reducer: {
      wallet: walletReducer,
      user: userReducer,
      notifications: notificationReducer,
    },
    preloadedState: {
      wallet: {
        isConnected: false,
        address: null,
        chainId: null,
        loading: false,
        error: null,
        network: { chainId: null, name: null, isSupported: false, blockExplorer: null },
        lastConnected: null,
        walletType: "metamask",
        ...walletOverrides,
      },
      notifications: { notifications: [], maxNotifications: 5 },
    },
  });

const wrapper =
  (store) =>
  ({ children }) =>
    React.createElement(Provider, { store }, children);

// ── setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  // Always provide a working ethereum stub so the hook's useEffect cleanup
  // can call removeListener on unmount without throwing.
  window.ethereum = makeEthereum();
  localStorage.clear();
});

// Do NOT delete window.ethereum in afterEach — the hook's cleanup effect
// runs during RTL's cleanup (which is also registered in afterEach) and
// needs window.ethereum.removeListener to be defined.

// ── tests ────────────────────────────────────────────────────────────────────

describe("useWalletConnect", () => {
  // ── connectWallet ─────────────────────────────────────────────────────────

  describe("connectWallet", () => {
    it("returns success and updates Redux with the connected address", async () => {
      const store = makeStore();
      const { result } = renderHook(() => useWalletConnect(), {
        wrapper: wrapper(store),
      });

      let connectResult;
      await act(async () => {
        connectResult = await result.current.connectWallet();
      });

      expect(connectResult.success).toBe(true);
      expect(connectResult.address).toBe(MOCK_ADDRESS);

      const state = store.getState();
      expect(state.wallet.isConnected).toBe(true);
      expect(state.wallet.address).toBe(MOCK_ADDRESS);
    });

    it("returns an error when MetaMask is not installed", async () => {
      const savedEthereum = window.ethereum;
      delete window.ethereum;

      const store = makeStore();
      const { result, unmount } = renderHook(() => useWalletConnect(), {
        wrapper: wrapper(store),
      });

      let connectResult;
      await act(async () => {
        connectResult = await result.current.connectWallet();
      });

      // Restore before unmount so the cleanup effect doesn't throw
      window.ethereum = savedEthereum;
      unmount();

      expect(connectResult.success).toBe(false);
      expect(connectResult.error).toMatch(/install MetaMask/i);
      expect(store.getState().wallet.isConnected).toBe(false);
    });

    it("returns a user-friendly error when the user rejects the request (code 4001)", async () => {
      const rejectionError = new Error("MetaMask user rejected");
      rejectionError.code = 4001;
      window.ethereum.request = jest.fn().mockRejectedValue(rejectionError);

      const store = makeStore();
      const { result } = renderHook(() => useWalletConnect(), {
        wrapper: wrapper(store),
      });

      let connectResult;
      await act(async () => {
        connectResult = await result.current.connectWallet();
      });

      expect(connectResult.success).toBe(false);
      expect(connectResult.error).toMatch(/rejected/i);
      expect(store.getState().wallet.isConnected).toBe(false);
    });

    it("returns a pending-request message when MetaMask has an existing pending request (code -32002)", async () => {
      const pendingError = new Error("Already processing");
      pendingError.code = -32002;
      window.ethereum.request = jest.fn().mockRejectedValue(pendingError);

      const store = makeStore();
      const { result } = renderHook(() => useWalletConnect(), {
        wrapper: wrapper(store),
      });

      let connectResult;
      await act(async () => {
        connectResult = await result.current.connectWallet();
      });

      expect(connectResult.success).toBe(false);
      expect(connectResult.error).toMatch(/pending|wallet/i);
    });

    it("returns error when eth_requestAccounts returns no accounts", async () => {
      window.ethereum.request = jest.fn(({ method }) => {
        if (method === "eth_requestAccounts") return Promise.resolve([]);
        if (method === "eth_accounts") return Promise.resolve([]);
        if (method === "eth_chainId") return Promise.resolve("0xaa36a7");
        return Promise.resolve(null);
      });

      const store = makeStore();
      const { result } = renderHook(() => useWalletConnect(), {
        wrapper: wrapper(store),
      });

      let connectResult;
      await act(async () => {
        connectResult = await result.current.connectWallet();
      });

      expect(connectResult.success).toBe(false);
      expect(store.getState().wallet.isConnected).toBe(false);
    });
  });

  // ── disconnectWallet ──────────────────────────────────────────────────────

  describe("disconnectWallet", () => {
    // Preload the store as already-connected to give disconnectWallet
    // meaningful work to do. Avoid seeding localStorage with a stored address
    // because the hook's initialization effect would race with our test action.
    const connectedState = {
      isConnected: true,
      address: MOCK_ADDRESS,
      chainId: "0xaa36a7",
      network: { chainId: "0xaa36a7", name: "Sepolia Testnet", isSupported: true, blockExplorer: null },
    };

    it("clears Redux wallet state and removes localStorage keys on success", async () => {
      localStorage.setItem("healthmint_wallet_address", MOCK_ADDRESS);
      localStorage.setItem("healthmint_wallet_connection", "true");

      const store = makeStore(connectedState);
      const { result } = renderHook(() => useWalletConnect(), {
        wrapper: wrapper(store),
      });

      await act(async () => {
        await result.current.disconnectWallet();
      });

      const state = store.getState();
      expect(state.wallet.isConnected).toBe(false);
      expect(state.wallet.address).toBeNull();
      expect(localStorage.getItem("healthmint_wallet_address")).toBeNull();
      expect(localStorage.getItem("healthmint_wallet_connection")).toBeNull();
    });

    it("still clears Redux state even when wallet.disconnect() throws", async () => {
      window.ethereum.disconnect = jest.fn().mockRejectedValue(new Error("disconnect failed"));

      const store = makeStore(connectedState);
      const { result } = renderHook(() => useWalletConnect(), {
        wrapper: wrapper(store),
      });

      await act(async () => {
        await result.current.disconnectWallet();
      });

      // Inner catch swallows the wallet.disconnect() error and continues —
      // Redux state should still be cleared.
      expect(store.getState().wallet.isConnected).toBe(false);
    });
  });
});
