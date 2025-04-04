// Modified version of AppContent.js to prevent initialization loops
import React, { useEffect, useState, useCallback, useRef } from "react";
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
import { AlertCircle, LogOut, X, Check } from "lucide-react";
import LoadingSpinner from "./ui/LoadingSpinner.js";

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
import { performLogout } from "../utils/authLoopPrevention.js";
import TransactionsPage from "../pages/TransactionPage.js";

/**
 * Logout confirmation dialog component
 */
const LogoutConfirmationDialog = ({ isOpen, onConfirm, onCancel }) => {
  // Close on ESC key
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onCancel]);

  // Prevent background scrolling when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      aria-modal="true"
      role="dialog"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 m-4">
        <div className="flex items-start mb-4">
          <div className="bg-red-100 p-2 rounded-full mr-3">
            <LogOut className="text-red-600 w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Confirm Logout
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to log out? This will disconnect your wallet
              and you'll need to reconnect to access your data again.
            </p>
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-100 rounded-md">
              <div className="flex">
                <AlertCircle className="text-yellow-600 w-5 h-5 flex-shrink-0 mr-2" />
                <p className="text-sm text-yellow-700">
                  Any pending transactions or unsaved changes may be lost.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={onCancel}
          >
            <span className="flex items-center">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </span>
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-red-600 border border-transparent rounded-md font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            onClick={onConfirm}
          >
            <span className="flex items-center">
              <Check className="w-4 h-4 mr-2" />
              Confirm Logout
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

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
    disconnectWallet,
    switchNetwork,
    getPendingTransactions,
  } = useWalletConnect();

  // Get user information from Redux
  const userRole = useSelector(selectRole);
  const isRoleSelected = useSelector(selectIsRoleSelected);

  // Get auth state
  const { isNewUser, verifyAuth, clearVerificationCache } = useAuth();

  // Track initialization state
  const [isInitialized, setIsInitialized] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [routeChecksBypassEnabled, setRouteChecksBypassEnabled] =
    useState(false);
  const [initializationAttempted, setInitializationAttempted] = useState(false);

  // Logout confirmation dialog state
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const pendingLogoutRef = useRef(false);

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

  // Add emergency loop breaker
  useEffect(() => {
    const emergencyTimeout = setTimeout(() => {
      if ((isVerifying || !isInitialized) && initializationAttempted) {
        console.warn("🚨 EMERGENCY: Breaking auth loop after 6s timeout", {
          isVerifying,
          isInitialized,
          initializationAttempted,
          location: location.pathname,
        });
        sessionStorage.setItem("auth_verification_override", "true");
        sessionStorage.setItem("bypass_route_protection", "true");
        sessionStorage.setItem("bypass_role_check", "true");
        setIsVerifying(false);
        setIsInitialized(true);
        clearVerificationCache();
        dispatch(
          addNotification({
            type: "warning",
            message:
              "Authentication took too long. Some features may be limited.",
            duration: 5000,
          })
        );
      }
    }, 6000); // Increased to 6s to give more time

    return () => clearTimeout(emergencyTimeout);
  }, [
    isVerifying,
    isInitialized,
    initializationAttempted,
    clearVerificationCache,
    dispatch,
    location.pathname,
  ]);

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

  // Verify authentication on first load with improved loop prevention
  useEffect(() => {
    // Only run this once
    if (initializationAttempted) {
      return;
    }

    setInitializationAttempted(true);

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

        // Use Promise.race with timeout to prevent hanging
        const authResult = await Promise.race([
          verifyAuth(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Auth verification timeout")),
              3000
            )
          ),
        ]);

        console.log("Auth verification complete:", authResult);
      } catch (error) {
        console.error("Auth verification error:", error);

        // On timeout or error, force initialization to proceed
        dispatch(
          addNotification({
            type: "warning",
            message:
              "Authentication verification timed out. Some features may be limited.",
            duration: 5000,
          })
        );
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
  }, [verifyAuth, routeChecksBypassEnabled, dispatch, initializationAttempted]);

  // Check for pending transactions
  const checkPendingTransactions = useCallback(async () => {
    try {
      if (typeof getPendingTransactions === "function") {
        const pendingTxs = await getPendingTransactions();
        return pendingTxs && pendingTxs.length > 0;
      }
      return false;
    } catch (error) {
      console.error("Error checking pending transactions:", error);
      return false;
    }
  }, [getPendingTransactions]);

  // Initiate logout process - shows confirmation dialog
  const initiateLogout = useCallback(() => {
    if (pendingLogoutRef.current) return;
    setShowLogoutConfirmation(true);
  }, []);

  // Handle logout confirmation
  const handleLogoutConfirm = useCallback(async () => {
    // Prevent multiple logout attempts
    if (pendingLogoutRef.current) return;
    pendingLogoutRef.current = true;

    try {
      // Check for pending transactions first
      const hasPendingTxs = await checkPendingTransactions();

      if (hasPendingTxs) {
        // Show warning about pending transactions
        dispatch(
          addNotification({
            type: "warning",
            message:
              "You have pending transactions. Logging out may affect these transactions.",
            duration: 7000,
          })
        );
      }

      console.log("Logging out and clearing all auth state...");
      setShowLogoutConfirmation(false);

      // Show logging out notification
      dispatch(
        addNotification({
          type: "info",
          message: "Logging out...",
          duration: 2000,
        })
      );

      // Clear Redux states first
      dispatch(clearWalletConnection());
      dispatch(clearRole());
      dispatch(clearUserProfile());

      // Try to disconnect the wallet
      try {
        await disconnectWallet();
        console.log("Wallet disconnected successfully");
      } catch (error) {
        console.error("Error disconnecting wallet:", error);
        // Continue with the process anyway
      }

      // Use the enhanced performLogout function with all required flags
      await performLogout({
        redirectToLogin: true,
        clearLocalStorage: true,
        clearSessionStorage: true,
        useHardRedirect: true,
        onComplete: () => {
          pendingLogoutRef.current = false;
        },
      });

      // The page should be redirected by now, but just in case:
      window.location.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
      pendingLogoutRef.current = false;

      // Show error notification
      dispatch(
        addNotification({
          type: "error",
          message: "Logout failed. Please try again.",
          duration: 5000,
        })
      );

      // Even on error, try to clear everything and redirect
      setTimeout(() => {
        // Force redirect to login
        window.location.replace("/login");
      }, 1000);
    }
  }, [disconnectWallet, dispatch, checkPendingTransactions]);

  // Cancel logout
  const handleLogoutCancel = useCallback(() => {
    setShowLogoutConfirmation(false);
    pendingLogoutRef.current = false;
  }, []);

  // Show loading state on initial render
  if (!isInitialized || isVerifying) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="large" />
          <p className="text-gray-600">Initializing Healthmint...</p>
        </div>
      </div>
    );
  }

  // Create a helper function to determine if we should show navigation
  const shouldShowNavigation = () => {
    return (
      isConnected &&
      // Ensure we have a wallet address either from Redux or localStorage
      (address || localStorage.getItem("healthmint_wallet_address")) &&
      !isNewUser &&
      location.pathname !== "/login" &&
      location.pathname !== "/register" &&
      location.pathname !== "/select-role"
    );
  };

  return (
    <>
      {/* Only show navigation when authenticated and not in registration or role selection */}
      {shouldShowNavigation() && (
        <Navigation
          account={address || localStorage.getItem("healthmint_wallet_address")}
          onLogout={initiateLogout}
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
                  walletAddress={
                    address || localStorage.getItem("healthmint_wallet_address")
                  }
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
          <Route
            path="/transactions"
            element={
              <ProtectedRoute>
                {isNewUser ? (
                  <Navigate to="/register" replace />
                ) : !isRoleSelected ? (
                  <Navigate to="/select-role" replace />
                ) : (
                  <TransactionsPage />
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
                  <LoadingSpinner size="large" />
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

      {/* Logout Confirmation Dialog */}
      <LogoutConfirmationDialog
        isOpen={showLogoutConfirmation}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
      />

      <Footer />
    </>
  );
}

export default AppContent;
