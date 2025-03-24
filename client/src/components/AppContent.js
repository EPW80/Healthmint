// src/components/AppContent.js
import React, { useEffect, useState } from "react";
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

// Hooks and Redux
import useWalletConnect from "../hooks/useWalletConnect.js";
import {
  selectRole,
  selectIsRoleSelected,
  setRole,
} from "../redux/slices/roleSlice.js";
import { updateUserProfile } from "../redux/slices/userSlice.js";
import { addNotification } from "../redux/slices/notificationSlice.js";

/**
 * Main content component with routing
 */
function AppContent() {
  const dispatch = useDispatch();
  const location = useLocation();

  // Keep track of the current route for debugging
  const [currentRoute, setCurrentRoute] = useState(location.pathname);

  // Debug pathname to track navigation
  console.log("Current pathname:", location.pathname);

  // Get wallet connection state
  const {
    isConnected,
    address,
    network,
    connectWallet,
    disconnectWallet,
    switchNetwork,
  } = useWalletConnect({
    autoConnect: false, // Changed to false to force explicit login
  });

  // Get role information from Redux
  const userRole = useSelector(selectRole);
  const isRoleSelected = useSelector(selectIsRoleSelected);

  // Track initialization state
  const [isInitialized, setIsInitialized] = useState(false);

  // Check current route to get better debug info
  useEffect(() => {
    setCurrentRoute(location.pathname);
    console.log(
      `Route changed to: ${location.pathname} | Role Selected: ${isRoleSelected} | Role: ${userRole}`
    );
  }, [location.pathname, isRoleSelected, userRole]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await disconnectWallet();

      // Clear any stored role
      localStorage.removeItem("healthmint_user_role");

      dispatch(
        addNotification({
          type: "info",
          message: "Logged out successfully",
        })
      );

      // Force navigation to login
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Handle wallet connection
  const handleConnect = async () => {
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

        return true;
      }
      return false;
    } catch (error) {
      console.error("Wallet connection error:", error);
      return false;
    }
  };

  // Set initialized after loading stored data
  useEffect(() => {
    try {
      // Check for stored role (backup check in case Redux doesn't load it)
      const storedRole = localStorage.getItem("healthmint_user_role");
      if (storedRole && !isRoleSelected) {
        console.log(`Found stored role in localStorage: ${storedRole}`);
        dispatch(setRole(storedRole));
      }
    } catch (err) {
      console.error("Error checking stored role:", err);
    } finally {
      setIsInitialized(true);
    }
  }, [dispatch, isRoleSelected]);

  // Determine dashboard component based on role
  const getDashboardComponent = () => {
    // We need to explicitly check here to avoid stale role data
    const currentStoredRole = localStorage.getItem("healthmint_user_role");
    const effectiveRole = userRole || currentStoredRole;

    if (effectiveRole === "researcher") {
      return <ResearcherDashboard />;
    }
    return <PatientDashboard />;
  };

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
      {/* Only show navigation when authenticated */}
      {isConnected && (
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
                // Redirect depending on role selection status
                <Navigate
                  to={isRoleSelected ? "/dashboard" : "/select-role"}
                  replace
                />
              ) : (
                <WalletConnect onConnect={handleConnect} />
              )
            }
          />

          {/* Role Selection Route */}
          <Route
            path="/select-role"
            element={
              !isConnected ? <Navigate to="/login" replace /> : <RoleSelector />
            }
          />

          {/* Dashboard Route - Specifically handle based on role */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={[]} requireBackendAuth={false}>
                {getDashboardComponent()}
              </ProtectedRoute>
            }
          />

          {/* Other protected routes */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute requireBackendAuth={false}>
                <ProfileSettings />
              </ProtectedRoute>
            }
          />

          <Route
            path="/upload"
            element={
              <ProtectedRoute requireBackendAuth={false}>
                <DataUpload />
              </ProtectedRoute>
            }
          />

          <Route
            path="/browse"
            element={
              <ProtectedRoute requireBackendAuth={false}>
                <DataBrowser />
              </ProtectedRoute>
            }
          />

          {/* Root path */}
          <Route
            path="/"
            element={
              !isConnected ? (
                <Navigate to="/login" replace />
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
              !isConnected ? (
                <Navigate to="/login" replace />
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
