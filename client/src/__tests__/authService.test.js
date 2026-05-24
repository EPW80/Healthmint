import authService from "./authService.js";
import hipaaComplianceService from "./hipaaComplianceService.js";

// Mock dependencies
jest.mock("../services/hipaaComplianceService", () => ({
  createAuditLog: jest.fn().mockResolvedValue({}),
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

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("authService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();

    // Initialize auth state
    authService.token = "test-token";
    authService.refreshToken = "test-refresh";
    authService.tokenExpiry = "2025-12-31T23:59:59Z";
    authService.userProfile = {
      name: "Test User",
      address: "0x123",
      role: "patient",
    };
    authService._isNewUser = false;
    authService.walletAddress = "0x123";

    // Add items to localStorage
    localStorageMock.setItem(authService.tokenKey, "test-token");
    localStorageMock.setItem(authService.refreshTokenKey, "test-refresh");
    localStorageMock.setItem(
      authService.tokenExpiryKey,
      "2025-12-31T23:59:59Z"
    );
    localStorageMock.setItem(
      authService.userProfileKey,
      JSON.stringify({ name: "Test User", address: "0x123", role: "patient" })
    );
    localStorageMock.setItem("healthmint_user_role", "patient");
  });

  describe("logout", () => {
    it("should clear auth state and local storage including role", async () => {
      // Call logout
      const result = await authService.logout();

      // Verify HIPAA audit log was created
      expect(hipaaComplianceService.createAuditLog).toHaveBeenCalledWith(
        "AUTH_LOGOUT",
        expect.objectContaining({
          action: "LOGOUT",
          walletAddress: "0x123",
        })
      );

      // Verify user role was removed
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        "healthmint_user_role"
      );

      // Verify auth token was removed
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        authService.tokenKey
      );

      // Verify service state was reset
      expect(authService.token).toBeNull();
      expect(authService.userProfile).toBeNull();

      // Verify successful result
      expect(result).toBe(true);
    });
  });
});
