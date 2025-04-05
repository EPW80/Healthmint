import { performLogout } from '../utils/authLoopPrevention';

describe('Logout Integration', () => {
  beforeEach(() => {
    jest.useFakeTimers(); // Enable fake timers
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers(); // Reset to real timers
  });

  test('should redirect to login page after logout, not role selector', async () => {
    const replaceSpy = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { replace: replaceSpy },
      writable: true,
    });

    await performLogout();
    jest.runAllTimers(); // Fast-forward timers to trigger redirect

    expect(replaceSpy).toHaveBeenCalledWith('/login');
  });
});