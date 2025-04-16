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
import DataMarketplace from "../pages/DataMarketplace.js";
import DataContributionPortal from "../pages/DataContributionPortal.js";
import AccessHistoryPage from "../pages/AccessHistoryPage.js"; // Add Access History import
import {
  HipaaGuide,
  DataSharingBenefits,
  PrivacyBestPractices,
  CitationGuidelines,
  ResearchEthics,
  CollaborationNetwork,
} from "../pages/resources"; // Add Resource imports
import DataVisualization from "./analytics/DataVisualization.js";
import StatisticalAnalysis from "./analytics/StatisticalAnalysis.js";
import PopulationStudies from "./analytics/PopulationStudies.js";

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
  const { isNewUser, verifyAuth, clearVerificationCache } = useAuth();

  // State management
  const [isInitialized, setIsInitialized] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const pendingLogoutRef = useRef(false);
  const initAttemptedRef = useRef(false);

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

  // Emergency loop breaker
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isVerifying && initAttemptedRef.current) {
        console.warn("AppContent: Emergency loop break after 6s", {
          location: location.pathname,
        });
        sessionStorage.setItem("auth_verification_override", "true");
        sessionStorage.setItem("bypass_route_protection", "true");
        setIsVerifying(false);
        setIsInitialized(true);
        clearVerificationCache();
        dispatch(
          addNotification({
            type: "warning",
            message: "Authentication timed out. Some features may be limited.",
            duration: 5000,
          })
        );
      }
    }, 6000);
    return () => clearTimeout(timeout);
  }, [isVerifying, clearVerificationCache, dispatch, location.pathname]);

  // Initial authentication verification
  useEffect(() => {
    if (initAttemptedRef.current) return;
    initAttemptedRef.current = true;

    const initAuth = async () => {
      setIsVerifying(true);
      try {
        console.log("AppContent: Verifying auth state...");
        await Promise.race([
          verifyAuth(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Auth timeout")), 3000)
          ),
        ]);
      } catch (error) {
        console.error("AppContent: Auth verification failed:", error);
        dispatch(
          addNotification({
            type: "warning",
            message: "Auth verification timed out.",
            duration: 5000,
          })
        );
      } finally {
        setIsVerifying(false);
        setIsInitialized(true);
      }
    };

    const timer = setTimeout(initAuth, 100);
    return () => clearTimeout(timer);
  }, [verifyAuth, dispatch]);

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

  if (!isInitialized || isVerifying) {
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
          {/* Analytics Tool Routes */}
          <Route
            path="/analysis/visualization"
            element={
              <ProtectedRoute allowedRoles={["researcher"]}>
                {isNewUser ? (
                  <Navigate to="/register" replace />
                ) : !isRoleSelected ? (
                  <Navigate to="/select-role" replace />
                ) : (
                  <DataVisualization />
                )}
              </ProtectedRoute>
            }
          />
          <Route
            path="/analysis/statistics"
            element={
              <ProtectedRoute allowedRoles={["researcher"]}>
                {isNewUser ? (
                  <Navigate to="/register" replace />
                ) : !isRoleSelected ? (
                  <Navigate to="/select-role" replace />
                ) : (
                  <StatisticalAnalysis />
                )}
              </ProtectedRoute>
            }
          />
          <Route
            path="/analysis/population-studies"
            element={
              <ProtectedRoute allowedRoles={["researcher"]}>
                {isNewUser ? (
                  <Navigate to="/register" replace />
                ) : !isRoleSelected ? (
                  <Navigate to="/select-role" replace />
                ) : (
                  <PopulationStudies />
                )}
              </ProtectedRoute>
            }
          />
          {/* Add Access History route */}
          <Route
            path="/history"
            element={
              <ProtectedRoute allowedRoles={["patient"]}>
                {isNewUser ? (
                  <Navigate to="/register" replace />
                ) : !isRoleSelected ? (
                  <Navigate to="/select-role" replace />
                ) : (
                  <AccessHistoryPage />
                )}
              </ProtectedRoute>
            }
          />
          {/* Data Marketplace route */}
          <Route
            path="/marketplace"
            element={
              <ProtectedRoute allowedRoles={["researcher"]}>
                {isNewUser ? (
                  <Navigate to="/register" replace />
                ) : !isRoleSelected ? (
                  <Navigate to="/select-role" replace />
                ) : (
                  <DataMarketplace />
                )}
              </ProtectedRoute>
            }
          />
          <Route
            path="/contribute"
            element={
              <ProtectedRoute allowedRoles={["patient"]}>
                {isNewUser ? (
                  <Navigate to="/register" replace />
                ) : !isRoleSelected ? (
                  <Navigate to="/select-role" replace />
                ) : (
                  <DataContributionPortal />
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
          {/* Resource Routes */}
          <Route
            path="/resources/hipaa-guide"
            element={
              <ProtectedRoute>
                {isNewUser ? (
                  <Navigate to="/register" replace />
                ) : !isRoleSelected ? (
                  <Navigate to="/select-role" replace />
                ) : (
                  <HipaaGuide />
                )}
              </ProtectedRoute>
            }
          />
          <Route
            path="/resources/sharing-benefits"
            element={
              <ProtectedRoute>
                {isNewUser ? (
                  <Navigate to="/register" replace />
                ) : !isRoleSelected ? (
                  <Navigate to="/select-role" replace />
                ) : (
                  <DataSharingBenefits />
                )}
              </ProtectedRoute>
            }
          />
          <Route
            path="/resources/privacy-practices"
            element={
              <ProtectedRoute>
                {isNewUser ? (
                  <Navigate to="/register" replace />
                ) : !isRoleSelected ? (
                  <Navigate to="/select-role" replace />
                ) : (
                  <PrivacyBestPractices />
                )}
              </ProtectedRoute>
            }
          />
          {/* Researcher-specific Resource Routes */}
          <Route
            path="/resources/citation-guidelines"
            element={
              <ProtectedRoute allowedRoles={["researcher"]}>
                {isNewUser ? (
                  <Navigate to="/register" replace />
                ) : !isRoleSelected ? (
                  <Navigate to="/select-role" replace />
                ) : (
                  <CitationGuidelines />
                )}
              </ProtectedRoute>
            }
          />
          <Route
            path="/resources/research-ethics"
            element={
              <ProtectedRoute allowedRoles={["researcher"]}>
                {isNewUser ? (
                  <Navigate to="/register" replace />
                ) : !isRoleSelected ? (
                  <Navigate to="/select-role" replace />
                ) : (
                  <ResearchEthics />
                )}
              </ProtectedRoute>
            }
          />
          <Route
            path="/network/join"
            element={
              <ProtectedRoute allowedRoles={["researcher"]}>
                {isNewUser ? (
                  <Navigate to="/register" replace />
                ) : !isRoleSelected ? (
                  <Navigate to="/select-role" replace />
                ) : (
                  <CollaborationNetwork />
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
