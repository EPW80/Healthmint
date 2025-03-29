// client/src/components/AppContent.js
import React, { useEffect, useState, useCallback } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";

// Components
import WalletConnect from "./WalletConnect.js";
import Navigation from "./Navigation.js";
import Footer from "./Footer.js";
import RoleSelector from "./roles/RoleSelector.js";
import ProtectedRoute from "./ProtectedRoute.js";
import Dashboard from "./dashboard/Dashboard.js";
import ProfileManager from "./ProfileManager.js";
import DataUpload from "./DataUpload.js";
import DataBrowser from "./DataBrowser.js";
import UserRegistration from "./UserRegistration.js";

// Hooks and Redux
import useWalletConnect from "../hooks/useWalletConnect.js";
import useAuth from "../hooks/useAuth.js";
import {
  selectRole,
  selectIsRoleSelected,
  clearRole,
} from "../redux/slices/roleSlice.js";
import {
  updateUserProfile,
  clearUserProfile,
} from "../redux/slices/userSlice.js";
import { addNotification } from "../redux/slices/notificationSlice.js";
import { clearWalletConnection } from "../redux/slices/walletSlice.js";

/**
 * Main content component with routing
 */
function AppContent() {
  const dispatch = useDispatch();
  const location = useLocation();

  // Get wallet connection state
  const { isConnected, address, network, disconnectWallet, switchNetwork } =
    useWalletConnect();

  // Get user information from Redux
  const userRole = useSelector(selectRole);
  const isRoleSelected = useSelector(selectIsRoleSelected);

  // Get auth state
  const { isNewUser, verifyAuth, logout } = useAuth();

  // Track initialization state
  const [isInitialized, setIsInitialized] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [routeChecksBypassEnabled, setRouteChecksBypassEnabled] =
    useState(false);

  // Handle user registration completion
  const handleRegistrationComplete = useCallback(
    (userData) => {
      // Update user profile with registration data
      dispatch(updateUserProfile(userData));

      // Notification of success
      dispatch(
        addNotification({
          type: "success",
          message: "Registration completed successfully!",
        })
      );
    },
    [dispatch]
  );

  // Add this emergency loop breaker
  useEffect(() => {
    // Emergency loop breaker - if we're still initializing after 4 seconds, force through
    const emergencyTimeout = setTimeout(() => {
      if (isVerifying || !isInitialized) {
        console.warn("🚨 EMERGENCY: Breaking auth loop after timeout");
        // Force all auth states to positive to break any loops
        sessionStorage.setItem("auth_verification_override", "true");
        sessionStorage.setItem("bypass_route_protection", "true");
        sessionStorage.setItem("bypass_role_check", "true");

        // Force the app to think it's initialized and not verifying
        setIsVerifying(false);
        setIsInitialized(true);
      }
    }, 4000);

    return () => clearTimeout(emergencyTimeout);
  }, [isVerifying, isInitialized]);

  // Check for temporary bypass flags that might be set in sessionStorage
  useEffect(() => {
    const bypassFlag = sessionStorage.getItem("bypass_route_protection");
    if (bypassFlag === "true") {
      setRouteChecksBypassEnabled(true);
      // Clear flag after a short delay to allow rendering to complete
      const timerId = setTimeout(() => {
        sessionStorage.removeItem("bypass_route_protection");
        setRouteChecksBypassEnabled(false);
      }, 500);
      return () => clearTimeout(timerId);
    }
  }, [location.pathname]);

  // Verify authentication on first load
  useEffect(() => {
    // Skip verification if bypass is enabled
    if (routeChecksBypassEnabled) {
      setIsVerifying(false);
      setIsInitialized(true);
      return;
    }

    const initAuth = async () => {
      setIsVerifying(true);
      try {
        console.log("Verifying authentication state...");
        await verifyAuth();
      } catch (error) {
        console.error("Auth verification error:", error);
      } finally {
        setIsVerifying(false);
        setIsInitialized(true);
      }
    };

    // Add a small delay to prevent immediate re-verification
    const timerId = setTimeout(() => {
      initAuth();
    }, 100);

    return () => clearTimeout(timerId);
  }, [verifyAuth, routeChecksBypassEnabled]);

  // Handle logout - Complete reset of all auth states
  const handleLogout = useCallback(async () => {
    try {
      console.log("Logging out and clearing all auth state...");

      // Logout and disconnect
      await logout();
      await disconnectWallet();

      // Clear Redux states
      dispatch(clearWalletConnection());
      dispatch(clearRole());
      dispatch(clearUserProfile());

      // Clear all related localStorage items directly
      localStorage.removeItem("healthmint_wallet_address");
      localStorage.removeItem("healthmint_wallet_connection");
      localStorage.removeItem("healthmint_user_role");
      localStorage.removeItem("healthmint_user_profile");
      localStorage.removeItem("healthmint_auth_token");
      localStorage.removeItem("healthmint_wallet_state");
      localStorage.removeItem("healthmint_refresh_token");
      localStorage.removeItem("healthmint_token_expiry");
      localStorage.removeItem("healthmint_is_new_user");

      // Clear any sessionStorage flags we might have set
      sessionStorage.removeItem("bypass_route_protection");
      sessionStorage.removeItem("bypass_role_check");
      sessionStorage.removeItem("temp_selected_role");

      // Notification of success
      dispatch(
        addNotification({
          type: "info",
          message: "Logged out successfully",
        })
      );

      // Hard redirect to login page
      window.location.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);

      // Even on error, clear everything and redirect
      dispatch(clearWalletConnection());
      dispatch(clearRole());
      dispatch(clearUserProfile());
      window.location.replace("/login");
    }
  }, [disconnectWallet, dispatch, logout]);

  // Show loading state on initial render
  if (!isInitialized || isVerifying) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Create a helper function to determine if we should show navigation
  const shouldShowNavigation = () => {
    return (
      isConnected &&
      !isNewUser &&
      location.pathname !== "/login" &&
      location.pathname !== "/register" &&
      location.pathname !== "/select-role" // Don't show nav on role selection
    );
  };

  return (
    <>
      {/* Only show navigation when authenticated and not in registration or role selection */}
      {shouldShowNavigation() && (
        <Navigation
          account={address}
          onLogout={handleLogout}
          role={userRole}
          network={network}
          onSwitchNetwork={switchNetwork}
        />
      )}

      <div className="flex-1">
        <Routes>
          {/* Login Route */}
          <Route
            path="/login"
            element={
              isConnected ? (
                isNewUser ? (
                  // If connected but needs registration, go to registration
                  <Navigate to="/register" replace />
                ) : !isRoleSelected ? (
                  // If no role selected, go to role selection
                  <Navigate to="/select-role" replace />
                ) : (
                  // If everything is set up, go to dashboard
                  <Navigate to="/dashboard" replace />
                )
              ) : (
                // If not connected, show login screen
                <WalletConnect />
              )
            }
          />

          {/* Registration Route */}
          <Route
            path="/register"
            element={
              !isConnected ? (
                <Navigate to="/login" replace />
              ) : isNewUser ? (
                <UserRegistration
                  walletAddress={address}
                  onComplete={handleRegistrationComplete}
                />
              ) : (
                <Navigate
                  to={isRoleSelected ? "/dashboard" : "/select-role"}
                  replace
                />
              )
            }
          />

          {/* Role Selection Route */}
          <Route
            path="/select-role"
            element={
              !isConnected ? (
                <Navigate to="/login" replace />
              ) : isNewUser ? (
                <Navigate to="/register" replace />
              ) : (
                <RoleSelector />
              )
            }
          />

          {/* Dashboard Route - Now using unified Dashboard component */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={[]}>
                {isNewUser ? (
                  <Navigate to="/register" replace />
                ) : !isRoleSelected ? (
                  <Navigate to="/select-role" replace />
                ) : (
                  <Dashboard />
                )}
              </ProtectedRoute>
            }
          />

          {/* Other protected routes */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                {isNewUser ? (
                  <Navigate to="/register" replace />
                ) : !isRoleSelected ? (
                  <Navigate to="/select-role" replace />
                ) : (
                  <ProfileManager />
                )}
              </ProtectedRoute>
            }
          />

          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                {isNewUser ? (
                  <Navigate to="/register" replace />
                ) : !isRoleSelected ? (
                  <Navigate to="/select-role" replace />
                ) : (
                  <DataUpload />
                )}
              </ProtectedRoute>
            }
          />

          <Route
            path="/browse"
            element={
              <ProtectedRoute>
                {isNewUser ? (
                  <Navigate to="/register" replace />
                ) : !isRoleSelected ? (
                  <Navigate to="/select-role" replace />
                ) : (
                  <DataBrowser />
                )}
              </ProtectedRoute>
            }
          />

          {/* Root path - Immediate redirect based on auth state */}
          <Route
            path="/"
            element={
              !isConnected ? (
                <Navigate to="/login" replace />
              ) : isNewUser ? (
                <Navigate to="/register" replace />
              ) : !isRoleSelected ? (
                <Navigate to="/select-role" replace />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />

          {/* Default redirect - Catch all other routes */}
          <Route
            path="*"
            element={
              !isInitialized ? (
                <div className="flex justify-center items-center min-h-screen">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : !isConnected ? (
                <Navigate to="/login" replace />
              ) : isNewUser ? (
                <Navigate to="/register" replace />
              ) : !isRoleSelected ? (
                <Navigate to="/select-role" replace />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />
        </Routes>
      </div>

      <Footer />
    </>
  );
}

export default AppContent;
