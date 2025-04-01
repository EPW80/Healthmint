// src/__tests__/LogoutIntegration.test.js
import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import { MemoryRouter } from "react-router-dom";
import App from "../App";
import { handleLogout } from "../utils/logoutUtils";

// Mock dependencies
jest.mock("../utils/logoutUtils", () => ({
  handleLogout: jest.fn().mockResolvedValue(true),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key]),
    setItem: jest.fn((key, value) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

// Mock window.location
const locationMock = {
  replace: jest.fn(),
};

Object.defineProperty(window, "localStorage", { value: localStorageMock });
Object.defineProperty(window, "location", { value: locationMock });

// Configure mock store
const mockStore = configureStore([]);

describe("Logout Integration", () => {
  let store;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();

    // Initialize localStorage with auth data
    localStorageMock.setItem("healthmint_auth_token", "test-token");
    localStorageMock.setItem("healthmint_user_role", "patient");
    localStorageMock.setItem("healthmint_wallet_connection", "true");

    // Create mock store with authenticated state
    store = mockStore({
      auth: {
        isAuthenticated: true,
        token: "test-token",
      },
      role: {
        role: "patient",
        isRoleSelected: true,
      },
      wallet: {
        isConnected: true,
        address: "0x123",
      },
      ui: {
        loading: false,
      },
      notifications: {
        notifications: [],
      },
      data: {},
      user: {
        profile: { role: "patient" },
        wallet: { isConnected: true },
      },
    });
  });

  it("should redirect to login page after logout, not role selector", async () => {
    // Call handleLogout directly (simplifying test)
    await handleLogout();

    // Verify localStorage was cleared of role
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(
      "healthmint_user_role"
    );

    // Verify we were redirected to the login page
    expect(locationMock.replace).toHaveBeenCalledWith("/login");

    // Importantly, verify we were NOT redirected to role selection
    expect(locationMock.replace).not.toHaveBeenCalledWith("/select-role");
  });
});
