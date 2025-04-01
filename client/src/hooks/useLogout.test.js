// src/hooks/useLogout.test.js
import { renderHook, act } from "@testing-library/react";
import { useDispatch } from "react-redux";
import useLogout from "./useLogout";
import { handleLogout } from "../utils/logoutUtils";

// Mock dependencies
jest.mock("react-redux", () => ({
  useDispatch: jest.fn(),
}));

jest.mock("../utils/logoutUtils", () => ({
  handleLogout: jest.fn().mockResolvedValue(true),
  createForceLogout: jest.fn(() => jest.fn()),
}));

describe("useLogout hook", () => {
  const dispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useDispatch.mockReturnValue(dispatch);
  });

  it("should call handleLogout and redirect to login page", async () => {
    // Render the hook
    const { result } = renderHook(() => useLogout());

    // Call logout
    let logoutResult;
    await act(async () => {
      logoutResult = await result.current.logout();
    });

    // Verify handleLogout was called
    expect(handleLogout).toHaveBeenCalled();
    expect(logoutResult).toBe(true);

    // Check loading state
    expect(result.current.loading).toBe(false);
  });

  it("should handle errors during logout", async () => {
    // Mock handleLogout to throw
    handleLogout.mockRejectedValueOnce(new Error("Logout failed"));

    // Render the hook
    const { result } = renderHook(() => useLogout());

    // Call logout
    let logoutResult;
    await act(async () => {
      logoutResult = await result.current.logout();
    });

    // Verify error was set
    expect(result.current.error).toBe("Logout failed");

    // Verify notification was dispatched
    expect(dispatch).toHaveBeenCalled();

    // Verify result is false
    expect(logoutResult).toBe(false);
  });
});
