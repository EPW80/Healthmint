import {
  resetVerificationAttempts,
  clearAuthStorage,
  performLogout,
} from "./authLoopPrevention.js";

// Mock localStorage and sessionStorage
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

const sessionStorageMock = (() => {
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

const locationMock = {
  replace: jest.fn(),
};

Object.defineProperty(window, "localStorage", { value: localStorageMock });
Object.defineProperty(window, "sessionStorage", { value: sessionStorageMock });
Object.defineProperty(window, "location", { value: locationMock });

describe("authLoopPrevention", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    sessionStorageMock.clear();
    resetVerificationAttempts();
  });

  describe("clearAuthStorage", () => {
    it("should clear all auth-related storage items including user role", () => {
      // Setup localStorage with items
      localStorageMock.setItem("healthmint_auth_token", "token123");
      localStorageMock.setItem("healthmint_user_role", "patient");
      localStorageMock.setItem("healthmint_wallet_connection", "true");

      // Setup sessionStorage with items
      sessionStorageMock.setItem("bypass_registration_check", "true");

      // Call the function
      clearAuthStorage();

      // Verify role was removed
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        "healthmint_user_role"
      );

      // Verify auth token was removed
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        "healthmint_auth_token"
      );

      // Verify wallet connection was removed
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        "healthmint_wallet_connection"
      );
    });
  });

  describe("performLogout", () => {
    it("should clear auth storage and redirect to login page", async () => {
      // Setup localStorage with items
      localStorageMock.setItem("healthmint_user_role", "patient");

      // Call the function
      await performLogout();

      // Verify role was removed
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        "healthmint_user_role"
      );

      // Verify redirect to login page
      expect(locationMock.replace).toHaveBeenCalledWith("/login");
    });
  });
});
