import { performLogout } from './authLoopPrevention';

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

describe('authLoopPrevention', () => {
  beforeEach(() => {
    // Mock localStorage and sessionStorage
    jest.spyOn(global.localStorage, 'clear').mockImplementation(() => {});
    jest.spyOn(global.sessionStorage, 'clear').mockImplementation(() => {});
    jest.spyOn(global.localStorage, 'removeItem').mockImplementation(() => {});
    jest.spyOn(global.sessionStorage, 'removeItem').mockImplementation(() => {});
    // Use fake timers to control setTimeout
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  test('performLogout should clear auth storage and redirect to login page', async () => {
    // Spy on window.location.replace
    const replaceSpy = jest.spyOn(window.location, 'replace').mockImplementation(() => {});

    // Call performLogout
    const logoutPromise = performLogout();
    // Advance timers past the initial 100ms delay
    jest.advanceTimersByTime(100);
    await logoutPromise;
    // Advance timers past the 150ms redirect timeout
    jest.advanceTimersByTime(150);

    // Verify storage is cleared
    expect(localStorage.clear).toHaveBeenCalled();
    expect(sessionStorage.clear).toHaveBeenCalled();
    // Verify redirect to login page
    expect(replaceSpy).toHaveBeenCalledWith('/login');

    replaceSpy.mockRestore();
  });
});
