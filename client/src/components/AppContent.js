// src/components/AppContent.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
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
import { AlertCircle, LogOut, X, Check } from "lucide-react";
import LoadingSpinner from "./ui/LoadingSpinner.js";

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
import TransactionsPage from "../pages/TransactionPage.js";

// Logout Confirmation Dialog
const LogoutConfirmationDialog = ({ isOpen, onConfirm, onCancel }) => {
  useEffect(() => {
    const handleEsc = (e) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onCancel]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto";
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
              Are you sure you want to log out? This will disconnect your
              wallet.
            </p>
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-100 rounded-md flex">
              <AlertCircle className="text-yellow-600 w-5 h-5 mr-2" />
              <p className="text-sm text-yellow-700">
                Pending transactions or unsaved changes may be lost.
              </p>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={onCancel}
          >
            <X className="w-4 h-4 mr-2 inline" /> Cancel
          </button>
          <button
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            onClick={onConfirm}
          >
            <Check className="w-4 h-4 mr-2 inline" /> Confirm Logout
          </button>
        </div>
      </div>
    </div>
  );
};

// Main AppContent Component
const AppContent = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const userRole = useSelector(selectRole);
  const isRoleSelected = useSelector(selectIsRoleSelected);
  const {
    isConnected,
    address,
    network,
    disconnectWallet,
    switchNetwork,
    getPendingTransactions,
  } = useWalletConnect();
  // Extract only what we use from useAuth
  const { isNewUser } = useAuth();

  // State management
  const [isInitialized, setIsInitialized] = useState(false);
  const pendingLogoutRef = useRef(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  
  // Force initialization after a short delay
  useEffect(() => {
    // Skip the verification entirely and just initialize
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 1000); // Short delay to show loading state
    
    return () => clearTimeout(timer);
  }, []);

  // Registration completion handler
  const handleRegistrationComplete = useCallback(
    (userData) => {
      dispatch(updateUserProfile(userData));
      dispatch(
        addNotification({
          type: "success",
          message: "Registration completed successfully!",
        })
      );
    },
    [dispatch]
  );

  // Check pending transactions
  const checkPendingTransactions = useCallback(async () => {
    try {
      const pendingTxs = await getPendingTransactions?.();
      return pendingTxs?.length > 0;
    } catch (error) {
      console.error("AppContent: Error checking pending transactions:", error);
      return false;
    }
  }, [getPendingTransactions]);

  // Logout handlers
  const initiateLogout = useCallback(() => {
    if (!pendingLogoutRef.current) setShowLogoutDialog(true);
  }, []);

  const handleLogoutConfirm = useCallback(async () => {
    if (pendingLogoutRef.current) return;
    pendingLogoutRef.current = true;

    try {
      sessionStorage.setItem("logout_in_progress", "true");
      const hasPendingTxs = await checkPendingTransactions();
      if (hasPendingTxs) {
        dispatch(
          addNotification({
            type: "warning",
            message: "Pending transactions detected. Logout may affect them.",
            duration: 7000,
          })
        );
      }

      setShowLogoutDialog(false);
      dispatch(
        addNotification({
          type: "info",
          message: "Logging out...",
          duration: 2000,
        })
      );
      dispatch(clearWalletConnection());
      dispatch(clearRole());
      dispatch(clearUserProfile());

      await disconnectWallet().catch((error) => {
        console.error("AppContent: Wallet disconnect failed:", error);
      });

      await performLogout({
        redirectToLogin: true,
        clearLocalStorage: true,
        clearSessionStorage: true,
        useHardRedirect: true,
        onComplete: () => (pendingLogoutRef.current = false),
      });

      window.location.replace("/login");
    } catch (error) {
      console.error("AppContent: Logout error:", error);
      dispatch(
        addNotification({
          type: "error",
          message: "Logout failed. Please try again.",
          duration: 5000,
        })
      );
      window.location.replace("/login");
    }
  }, [disconnectWallet, dispatch, checkPendingTransactions]);

  const handleLogoutCancel = useCallback(() => {
    setShowLogoutDialog(false);
    pendingLogoutRef.current = false;
  }, []);

  // Navigation visibility
  const shouldShowNavigation = useCallback(() => {
    return (
      isConnected &&
      (address || localStorage.getItem("healthmint_wallet_address")) &&
      !isNewUser &&
      !["/login", "/register", "/select-role"].includes(location.pathname)
    );
  }, [isConnected, address, isNewUser, location.pathname]);

  // Memoized Navigation to prevent re-renders
  const MemoizedNavigation = React.memo(
    ({ account, onLogout, role, network, onSwitchNetwork }) => (
      <Navigation
        account={account}
        onLogout={onLogout}
        role={role}
        network={network}
        onSwitchNetwork={onSwitchNetwork}
      />
    )
  );

  if (!isInitialized) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="large" />
        <p className="text-gray-600 mt-4">Initializing Healthmint...</p>
      </div>
    );
  }

  return (
    <>
      {shouldShowNavigation() && (
        <MemoizedNavigation
          account={address || localStorage.getItem("healthmint_wallet_address")}
          onLogout={initiateLogout}
          role={userRole}
          network={network}
          onSwitchNetwork={switchNetwork}
        />
      )}
      <div className="flex-1">
        <Routes>
          <Route
            path="/login"
            element={
              isConnected ? (
                isNewUser ? (
                  <Navigate to="/register" replace />
                ) : !isRoleSelected ? (
                  <Navigate to="/select-role" replace />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              ) : (
                <WalletConnect />
              )
            }
          />
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
              <ProtectedRoute allowedRoles={["patient"]}>
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
              <ProtectedRoute allowedRoles={["researcher"]}>
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
          <Route
            path="*"
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
        </Routes>
      </div>
      <LogoutConfirmationDialog
        isOpen={showLogoutDialog}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
      />
      <Footer />
    </>
  );
};

export default AppContent;