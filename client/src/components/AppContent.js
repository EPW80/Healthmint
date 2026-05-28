// src/components/AppContent.js
import React, {
  lazy,
  Suspense,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import useWalletConnect from "../hooks/useWalletConnect.js";
import {
  useWalletAddress,
  useIsConnected,
  useWalletNetwork,
} from "../hooks/useWallet.js";
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
import { STORAGE_KEYS } from "../config/storageKeys.js";
import { AlertCircle, LogOut, X, Check } from "lucide-react";
import LoadingSpinner from "./ui/LoadingSpinner.js";
import Modal from "./ui/Modal.js";
import { Button } from "./ui/index.js";

// Always-eager shell components (needed on first paint)
import WalletConnect from "./WalletConnect.js";
import Navigation from "./Navigation.js";
import Footer from "./Footer.js";
import RoleSelector from "./roles/RoleSelector.js";
import ProtectedRoute from "./ProtectedRoute.js";

// Lazy-loaded page components (split into separate chunks)
const Dashboard = lazy(() => import("./dashboard/Dashboard.js"));
const ProfileManager = lazy(() => import("./ProfileManager.js"));
const DataUpload = lazy(() => import("./DataUpload.js"));
const DataBrowser = lazy(() => import("./DataBrowser.js"));
const UserRegistration = lazy(() => import("./UserRegistration.js"));
const TransactionsPage = lazy(() => import("../pages/TransactionPage.js"));
const DataMarketplace = lazy(() => import("../pages/DataMarketplace.js"));
const DataContributionPortal = lazy(
  () => import("../pages/DataContributionPortal.js")
);
const AccessHistoryPage = lazy(() => import("../pages/AccessHistoryPage.js"));
const DataVisualization = lazy(
  () => import("./analytics/DataVisualization.js")
);
const StatisticalAnalysis = lazy(
  () => import("./analytics/StatisticalAnalysis.js")
);
const PopulationStudies = lazy(
  () => import("./analytics/PopulationStudies.js")
);
const FileUploader = lazy(() => import("../components/FileUploader"));
const StoragePage = lazy(() => import("../pages/StoragePage"));

// Resource pages (lazy — each loads on demand)
const HipaaGuide = lazy(() => import("../pages/resources/HipaaGuide.js"));
const DataSharingBenefits = lazy(
  () => import("../pages/resources/DataSharingBenefits.js")
);
const PrivacyBestPractices = lazy(
  () => import("../pages/resources/PrivacyBestPractices.js")
);
const CitationGuidelines = lazy(
  () => import("../pages/resources/CitationGuidelines.js")
);
const ResearchEthics = lazy(
  () => import("../pages/resources/ResearchEthics.js")
);
const CollaborationNetwork = lazy(
  () => import("../pages/resources/CollaborationNetwork.js")
);

// Logout Confirmation Dialog
const LogoutConfirmationDialog = ({ isOpen, onConfirm, onCancel }) => (
  <Modal
    isOpen={isOpen}
    onClose={onCancel}
    title="Confirm Logout"
    size="md"
  >
    <div className="p-6">
      <div className="flex items-start mb-4">
        <div className="bg-danger/10 p-2 rounded-full mr-3 flex-shrink-0">
          <LogOut className="text-danger w-6 h-6" />
        </div>
        <div>
          <p className="mt-1 text-sm text-fg-muted">
            Are you sure you want to log out? This will disconnect your wallet.
          </p>
          <div className="mt-2 p-3 bg-warning/10 border border-warning/20 rounded-md flex items-start">
            <AlertCircle className="text-warning w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-fg-muted">
              Pending transactions or unsaved changes may be lost.
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onCancel}>
          <X className="w-4 h-4" /> Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          <Check className="w-4 h-4" /> Confirm Logout
        </Button>
      </div>
    </div>
  </Modal>
);

// Main AppContent Component
const AppContent = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const userRole = useSelector(selectRole);
  const isRoleSelected = useSelector(selectIsRoleSelected);
  // Read-only wallet state via selector hooks (avoids re-render on every
  // useWalletConnect internal state change).
  const isConnected = useIsConnected();
  const address = useWalletAddress();
  const network = useWalletNetwork();
  // Mutation methods still come from the full hook.
  const { disconnectWallet, switchNetwork, getPendingTransactions } =
    useWalletConnect();
  const { isAuthenticated, isNewUser, verifyAuth, clearVerificationCache } =
    useAuth();

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
        // Don't set bypass flags here — letting unauthenticated users through
        // protected routes creates a security hole. ProtectedRoute will see no
        // valid JWT and redirect to /login on its own.
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
    const initAuth = async () => {
      // Guard inside the async fn so React Strict Mode's effect double-invoke
      // doesn't prevent execution (timer is cancelled by cleanup before it fires
      // on the first cycle, so the ref is never prematurely set).
      if (initAttemptedRef.current) return;
      initAttemptedRef.current = true;

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
      (address || localStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS)) &&
      !isNewUser &&
      !["/login", "/register", "/select-role"].includes(location.pathname)
    );
  }, [isConnected, address, isNewUser, location.pathname]);

  if (!isInitialized || isVerifying) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="large" />
        <p className="text-fg-muted mt-4">Initializing Healthmint...</p>
      </div>
    );
  }

  return (
    <>
      {shouldShowNavigation() && (
        <Navigation
          account={address || localStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS)}
          onLogout={initiateLogout}
          role={userRole}
          network={network}
          onSwitchNetwork={switchNetwork}
        />
      )}
      <main id="main-content" className="flex-1">
        <Suspense
          fallback={
            <div className="flex justify-center items-center min-h-screen">
              <LoadingSpinner size="large" label="Loading page..." showLabel />
            </div>
          }
        >
          <Routes>
            <Route
              path="/login"
              element={
                // Require both wallet connection AND a valid JWT before
                // redirecting away. isConnected alone just means the address
                // is cached from a prior session — the user still needs to
                // re-sign with MetaMask to get a fresh token.
                isConnected && isAuthenticated ? (
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
                      address ||
                      localStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS)
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
            <Route path="/test/upload" element={<FileUploader />} />
            <Route
              path="/storage"
              element={
                !isConnected ? (
                  <Navigate to="/login" replace />
                ) : isNewUser ? (
                  <Navigate to="/register" replace />
                ) : !isRoleSelected ? (
                  <Navigate to="/select-role" replace />
                ) : (
                  <StoragePage />
                )
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
        </Suspense>
      </main>
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
