// src/hooks/useAuth.test.js
import { renderHook, act } from "@testing-library/react";
import { useDispatch } from "react-redux";
import useAuth from "./useAuth";
import {
  performLogout,
  resetVerificationAttempts,
} from "../utils/authLoopPrevention";

// Mock dependencies
jest.mock("react-redux", () => ({
  useDispatch: jest.fn(),
}));

jest.mock("../utils/authLoopPrevention", () => ({
  performLogout: jest.fn().mockResolvedValue(true),
  resetVerificationAttempts: jest.fn(),
  clearVerificationCache: jest.fn(),
}));

describe("useAuth hook - logout functionality", () => {
  const dispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useDispatch.mockReturnValue(dispatch);
  });

  it("should call performLogout and reset verification state", async () => {
    // Render the hook
    const { result } = renderHook(() => useAuth());

    // Call logout
    let logoutResult;
    await act(async () => {
      logoutResult = await result.current.logout();
    });

    // Verify performLogout was called
    expect(performLogout).toHaveBeenCalled();

    // Verify resetVerificationAttempts was called
    expect(resetVerificationAttempts).toHaveBeenCalled();

    // Verify state was updated
    expect(result.current.isAuthenticated).toBe(false);

    // Verify notification was dispatched
    expect(dispatch).toHaveBeenCalled();

    // Verify result is true
    expect(logoutResult).toBe(true);
  });
});
