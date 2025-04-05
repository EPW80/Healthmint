import { handleLogout } from './logoutUtils';

describe('logoutUtils', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  test('handleLogout should clear auth state and redirect to login page', async () => {
    const replaceSpy = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { replace: replaceSpy },
      writable: true,
    });

    await handleLogout();
    jest.runAllTimers();

    expect(replaceSpy).toHaveBeenCalledWith('/login');
  });
});