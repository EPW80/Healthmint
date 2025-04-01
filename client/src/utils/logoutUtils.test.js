// src/utils/logoutUtils.test.js
import { handleLogout, createForceLogout } from '../utils/logoutUtils';
import { store } from '../redux/store';
import authService from '../services/authService';
import hipaaComplianceService from '../services/hipaaComplianceService';

// Mock dependencies
jest.mock('../redux/store', () => ({
  store: {
    dispatch: jest.fn(),
  },
}));

jest.mock('../services/authService', () => ({
  logout: jest.fn().mockResolvedValue(true),
}));

jest.mock('../services/hipaaComplianceService', () => ({
  createAuditLog: jest.fn().mockImplementation(() => Promise.resolve({})),
}));

// Mock localStorage and sessionStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key]),
    setItem: jest.fn((key, value) => { store[key] = value; }),
    removeItem: jest.fn(key => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();

const sessionStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key]),
    setItem: jest.fn((key, value) => { store[key] = value; }),
    removeItem: jest.fn(key => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();

// Mock window.location
const locationMock = {
  replace: jest.fn(),
};

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });
Object.defineProperty(window, 'location', { value: locationMock });

describe('logoutUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    sessionStorageMock.clear();
  });

  describe('handleLogout', () => {
    it('should clear auth state and redirect to login page', async () => {
      // Set up localStorage with role data
      localStorageMock.setItem('healthmint_user_role', 'patient');
      localStorageMock.setItem('healthmint_wallet_connection', 'true');
      localStorageMock.setItem('healthmint_wallet_address', '0x123');

      // Set up callbacks for testing
      const onLogoutStart = jest.fn();
      const onLogoutComplete = jest.fn();

      // Call the function
      await handleLogout({
        showNotification: true,
        onLogoutStart,
        onLogoutComplete,
      });

      // Verify auth service was called
      expect(authService.logout).toHaveBeenCalled();

      // Verify hipaa audit log was created
      expect(hipaaComplianceService.createAuditLog).toHaveBeenCalledWith(
        'USER_LOGOUT',
        expect.objectContaining({
          action: 'LOGOUT',
        })
      );

      // Verify localStorage items were removed - especially role
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('healthmint_user_role');
      
      // Verify callbacks were called
      expect(onLogoutStart).toHaveBeenCalled();
      expect(onLogoutComplete).toHaveBeenCalledWith(true);

      // Verify redirection to login page
      expect(locationMock.replace).toHaveBeenCalledWith('/login');
    });
  });
});