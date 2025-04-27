// client/src/hooks/useLogout.js
import { useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import { addNotification } from "../redux/slices/notificationSlice.js";
import { handleLogout, createForceLogout } from "../utils/logoutUtils.js";

// This hook provides a simple way to perform a logout operation,
const useLogout = (options = {}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dispatch = useDispatch();

  // Hook to perform the logout operation
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Use our centralized logout handler
      await handleLogout({
        ...options,
        onLogoutStart: () => setLoading(true),
        onLogoutComplete: (success, err) => {
          setLoading(false);
          if (!success && err) {
            setError(err.message || "Logout failed");
          }
        },
      });

      return true;
    } catch (err) {
      setError(err.message || "Logout failed");

      dispatch(
        addNotification({
          type: "error",
          message: "Logout failed. Please try again.",
          duration: 5000,
        })
      );

      return false;
    } finally {
      setLoading(false);
    }
  }, [dispatch, options]);

  // Hook to perform a force logout operation
  const forceLogout = useCallback(
    (message) => {
      const forceLogoutFn = createForceLogout({
        ...options,
        message,
      });

      forceLogoutFn();
    },
    [options]
  );

  // Hook to clear the error message
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    logout,
    forceLogout,
    loading,
    error,
    clearError,
  };
};

export default useLogout;
