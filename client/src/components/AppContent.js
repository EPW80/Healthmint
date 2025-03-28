// src/components/AppContent.js
import React, { useEffect, useState, useCallback } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";

// Components
import WalletConnect from "./WalletConnect.js";
import Navigation from "./Navigation.js";
import Footer from "./Footer.js";
import RoleSelector from "./roles/RoleSelector.js";
import ProtectedRoute from "./ProtectedRoute.js";
import PatientDashboard from "./dashboard/PatientDashboard.js";
import ResearcherDashboard from "./dashboard/ResearcherDashboard.js";
import ProfileSettings from "./ProfileSettings.js";
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
  selectUserProfile,
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
  const {
    isConnected,
    address,
    network,
    connectWallet,
    disconnectWallet,
    switchNetwork,
  } = useWalletConnect({
    autoConnect: false, // Force explicit login
  });

  // Get user information from Redux
  const userRole = useSelector(selectRole);
  const isRoleSelected = useSelector(selectIsRoleSelected);
  const userProfile = useSelector(selectUserProfile);

  // Get auth state
  const { isAuthenticated, isNewUser, verifyAuth } = useAuth();

  // Track initialization state
  const [isInitialized, setIsInitialized] = useState(false);
  const [needsRegistration, setNeedsRegistration] = useState(false);

  // Handle user registration completion
  const handleRegistrationComplete = useCallback(
    (userData) => {
      // Update user profile with registration data
      dispatch(updateUserProfile(userData));

      // Clear the registration flag
      setNeedsRegistration(false);

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

  // Ensure proper redirection on first load
  useEffect(() => {
    if (isInitialized) {
      // If not connected, redirect to login
      if (!isConnected) {
        if (window.location.pathname !== "/login") {
          window.location.replace("/login");
        }
        return;
      }

      // If connected but needs registration, redirect there
      if (needsRegistration || isNewUser) {
        if (window.location.pathname !== "/register") {
          window.location.replace("/register");
        }
        return;
      }

      // If connected but no role, redirect to role selection
      if (!isRoleSelected) {
        if (window.location.pathname !== "/select-role") {
          window.location.replace("/select-role");
        }
        return;
      }

      // If everything is set up, redirect to dashboard from root or login
      if (
        window.location.pathname === "/" ||
        window.location.pathname === "/login"
      ) {
        window.location.replace("/dashboard");
      }
    }
  }, [
    isInitialized,
    isConnected,
    needsRegistration,
    isNewUser,
    isRoleSelected,
  ]);

  // Initialize the app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // When running with mock data, we don't need to wait for actual connections
        // Initialize immediately to prevent loading state delays
        setIsInitialized(true);
      } catch (error) {
        console.error("Error during app initialization:", error);
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, []);

  // Check if user needs registration when connected
  useEffect(() => {
    if (isConnected && address) {
      // Check if user needs to complete registration
      const checkRegistrationStatus = async () => {
        try {
          // Verify authentication state
          await verifyAuth();

          // If the user is authenticated but doesn't have a complete profile
          // or is explicitly marked as a new user, they need registration
          if (isAuthenticated) {
            const profileIncomplete = !userProfile?.name || !userProfile?.role;
            const requiresRegistration = isNewUser || profileIncomplete;

            // Set registration flag more aggressively for new users
            setNeedsRegistration(requiresRegistration);

            // Make sure we redirect to registration immediately if needed
            if (requiresRegistration && location.pathname !== "/register") {
              // Use window.location to force a clean navigation
              window.location.replace("/register");
            }
          }
        } catch (error) {
          console.error("Error checking registration status:", error);
        }
      };

      checkRegistrationStatus();
    }
  }, [
    isConnected,
    address,
    isAuthenticated,
    isNewUser,
    userProfile,
    verifyAuth,
    location.pathname,
  ]);

  // Handle logout - Complete reset of all auth states
  const handleLogout = useCallback(async () => {
    try {
      console.log("Logging out and clearing all auth state...");

      // Disconnect wallet first
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
  }, [disconnectWallet, dispatch]);

  // Handle wallet connection
  const handleConnect = useCallback(async () => {
    try {
      const result = await connectWallet();
      if (result.success) {
        dispatch(updateUserProfile({ address: result.address }));
        dispatch(
          addNotification({
            type: "success",
            message: "Wallet connected successfully",
          })
        );

        // After successful connection, check if this is a new user
        const profileIncomplete = !userProfile?.name || !userProfile?.role;
        const requiresRegistration = isNewUser || profileIncomplete;
        setNeedsRegistration(requiresRegistration);

        if (requiresRegistration) {
          // Redirect to registration immediately
          window.location.replace("/register");
        }

        return true;
      }
      return false;
    } catch (error) {
      console.error("Wallet connection error:", error);
      return false;
    }
  }, [connectWallet, dispatch, isNewUser, userProfile]);

  // Determine dashboard component based on role
  const getDashboardComponent = useCallback(() => {
    if (userRole === "researcher") {
      return <ResearcherDashboard />;
    }
    return <PatientDashboard />;
  }, [userRole]);

  // Show loading state on initial render
  if (!isInitialized) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      {/* Only show navigation when authenticated and not in registration */}
      {isConnected &&
        !needsRegistration &&
        location.pathname !== "/login" &&
        location.pathname !== "/register" && (
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
          {/* Login Route - Always accessible, redirects appropriately */}
          <Route
            path="/login"
            element={
              isConnected ? (
                // If connected and needs registration, go to registration
                // Otherwise follow normal flow to role selection or dashboard
                needsRegistration ? (
                  <Navigate to="/register" replace />
                ) : !isRoleSelected ? (
                  <Navigate to="/select-role" replace />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              ) : (
                <WalletConnect onConnect={handleConnect} />
              )
            }
          />

          {/* Registration Route */}
          <Route
            path="/register"
            element={
              !isConnected ? (
                <Navigate to="/login" replace />
              ) : needsRegistration ? (
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
              ) : needsRegistration ? (
                <Navigate to="/register" replace />
              ) : (
                <RoleSelector />
              )
            }
          />

          {/* Dashboard Route - Specifically handle based on role */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={[]} requireBackendAuth={false}>
                {needsRegistration ? (
                  <Navigate to="/register" replace />
                ) : (
                  getDashboardComponent()
                )}
              </ProtectedRoute>
            }
          />

          {/* Other protected routes */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute requireBackendAuth={false}>
                {needsRegistration ? (
                  <Navigate to="/register" replace />
                ) : (
                  <ProfileSettings />
                )}
              </ProtectedRoute>
            }
          />

          <Route
            path="/upload"
            element={
              <ProtectedRoute requireBackendAuth={false}>
                {needsRegistration ? (
                  <Navigate to="/register" replace />
                ) : (
                  <DataUpload />
                )}
              </ProtectedRoute>
            }
          />

          <Route
            path="/browse"
            element={
              <ProtectedRoute requireBackendAuth={false}>
                {needsRegistration ? (
                  <Navigate to="/register" replace />
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
              ) : needsRegistration ? (
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
              ) : needsRegistration ? (
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
