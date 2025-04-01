// src/components/roles/RoleSelector.js
import React, { useState, useEffect, useCallback } from "react";
import LogoutButton from "../LogoutButton.js";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { User, Microscope, Loader } from "lucide-react";
import { setRole } from "../../redux/slices/roleSlice.js";
import { addNotification } from "../../redux/slices/notificationSlice.js";
import { updateUserProfile } from "../../redux/slices/userSlice.js";
import hipaaComplianceService from "../../services/hipaaComplianceService.js";
import authService from "../../services/authService.js";
import authUtils from "../../utils/authUtils.js";
import WalletErrorNotification from "../WalletErrorNotification.js";


/**
 * Role Selector Component with improved navigation
 */
const RoleSelector = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Get wallet address from Redux state
  const walletAddress = useSelector((state) => state.wallet.address);

  // Local state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [redirecting, setRedirecting] = useState(false);
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);

  // Check for an existing role in localStorage or user profile
  useEffect(() => {
    // If we're already checking or redirecting, skip
    if (redirecting || initialCheckComplete) {
      return;
    }

    const checkExistingRole = () => {
      console.log("Checking for existing role...");

      // First, check if we came from a redirect loop - if so, don't redirect again
      const fromPath = location.state?.from;
      if (fromPath === "/dashboard") {
        console.log("Coming from dashboard, skipping role redirect");
        setInitialCheckComplete(true);
        return false;
      }

      // Check if we have an explicit bypass flag
      if (sessionStorage.getItem("bypass_role_check") === "true") {
        console.log("Bypassing role check due to session flag");
        // Clear the flag after using it once
        sessionStorage.removeItem("bypass_role_check");
        setInitialCheckComplete(true);
        return false;
      }

      // Check user profile first
      const userProfile = authService.getCurrentUser();
      if (userProfile && userProfile.role) {
        console.log(`Existing role found: ${userProfile.role}`);
        dispatch(setRole(userProfile.role));
        return true;
      }

      // Check localStorage as fallback
      const storedRole = localStorage.getItem("healthmint_user_role");
      if (storedRole) {
        console.log(`Role found in localStorage: ${storedRole}`);
        dispatch(setRole(storedRole));
        return true;
      }

      setInitialCheckComplete(true);
      return false;
    };

    const hasRole = checkExistingRole();

    // If role is detected and we're not already redirecting, go to dashboard
    if (hasRole && !redirecting) {
      // Set a flag to prevent route protection loops
      sessionStorage.setItem("bypass_route_protection", "true");

      // Mark that we're redirecting to prevent multiple redirects
      setRedirecting(true);
      setInitialCheckComplete(true);

      // Navigate to dashboard
      navigate("/dashboard", { replace: true });
    }
  }, [dispatch, navigate, redirecting, location.state, initialCheckComplete]);

  // Check for wallet address
  useEffect(() => {
    // Try to get the wallet address from localStorage as fallback
    const localStorageAddress = localStorage.getItem(
      "healthmint_wallet_address"
    );

    if (!walletAddress && !localStorageAddress) {
      setError("Wallet address not found. Please reconnect your wallet.");
    } else if (
      error === "Wallet address not found. Please reconnect your wallet."
    ) {
      // Clear any existing wallet error if we now have a wallet address
      setError(null);
    }
  }, [walletAddress, error]);

  /**
   * Handle role selection with improved user data persistence and error handling
   */
  const handleRoleSelect = useCallback(
    async (role) => {
      try {
        // Prevent multiple submissions
        if (loading) return;

        setLoading(true);
        setError(null);
        setSelectedRole(role);
        setRedirecting(true);

        console.log(`Setting role: ${role}`); // Debug log

        // Create a bypass flag to prevent infinite redirects
        sessionStorage.setItem("bypass_route_protection", "true");
        sessionStorage.setItem("temp_selected_role", role);

        // Audit role selection for HIPAA compliance
        await hipaaComplianceService.createAuditLog("ROLE_SELECTION", {
          role,
          timestamp: new Date().toISOString(),
          action: "SELECT",
        });

        // Use the address from Redux state first, then fallback to localStorage
        const currentWalletAddress =
          walletAddress || localStorage.getItem("healthmint_wallet_address");

        if (!currentWalletAddress) {
          throw new Error(
            "Wallet address not found. Please reconnect your wallet."
          );
        }

        // Get current user data to merge with role
        const userData = authService.getCurrentUser() || {};

        const updatedUserData = {
          ...userData,
          name: userData.name || "User",
          role,
          address: currentWalletAddress,
          lastUpdated: new Date().toISOString(),
        };

        // Update user data in authService with more robust error handling
        const registrationSuccess = authUtils.forceRegistrationComplete(
          role,
          currentWalletAddress,
          updatedUserData
        );

        if (!registrationSuccess) {
          console.error("Failed to complete registration via authUtils");
          // Fallback method
          authService.completeRegistration(updatedUserData);
        }

        // Explicitly set in localStorage for redundancy
        localStorage.setItem("healthmint_user_role", role);
        localStorage.setItem("healthmint_is_new_user", "false");

        // Make sure the wallet connection is marked as true
        localStorage.setItem("healthmint_wallet_connection", "true");

        // Dispatch role selection action to Redux
        dispatch(setRole(role));

        // Update user profile with role information
        dispatch(updateUserProfile(updatedUserData));

        // Success notification
        dispatch(
          addNotification({
            type: "success",
            message: `Successfully set role as ${role === "patient" ? "Patient" : "Researcher"}`,
            duration: 3000,
          })
        );

        // Use React Router navigation with a state flag to prevent loops
        navigate("/dashboard", {
          replace: true,
          state: { roleJustSelected: true },
        });
      } catch (err) {
        console.error("Role selection error:", err);
        setError(err.message || "Failed to set role. Please try again.");

        dispatch(
          addNotification({
            type: "error",
            message: err.message || "Failed to set role. Please try again.",
          })
        );

        setLoading(false);
        setRedirecting(false);

        // Clear any bypass flags on error
        sessionStorage.removeItem("bypass_route_protection");
        sessionStorage.removeItem("temp_selected_role");
      }
    },
    [dispatch, loading, navigate, walletAddress]
  );

  // Handle error notification close
  const handleErrorClose = () => {
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      {/* Add Logout Button in the header area */}
      <div className="absolute top-4 right-4">
        <LogoutButton 
          variant="text" 
          size="sm" 
          className="text-gray-600 hover:text-gray-800" 
        />
      </div>
      {/* Error notification popup */}
      {error && error.includes("Wallet address not found") && (
        <WalletErrorNotification
          message={error}
          isVisible={true}
          onClose={handleErrorClose}
          autoRedirect={false}
        />
      )}
      <div className="max-w-4xl w-full">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Choose Your Role</h1>
          <p className="text-gray-600">
            Select how you want to use the Healthmint platform
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6 justify-center items-stretch">
          {/* Patient Card */}
          <div
            className={`w-full md:w-1/2 bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 ${
              selectedRole === "patient" ? "ring-2 ring-blue-500" : ""
            } ${loading ? "opacity-75 pointer-events-none" : ""}`}
            onClick={() => !loading && handleRoleSelect("patient")}
          >
            <div className="p-8 flex flex-col items-center gap-4 h-full">
              <div className="bg-blue-50 p-4 rounded-full">
                <User className="w-12 h-12 text-blue-500" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800">Patient</h2>
              <p className="text-sm text-gray-600 text-center leading-relaxed flex-grow">
                Share and manage your health data securely on the blockchain.
                Control access to your records and potentially earn rewards for
                contributing to medical research.
              </p>
              <button
                className={`w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors mt-2 flex items-center justify-center ${
                  loading ? "opacity-75 cursor-not-allowed" : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  !loading && handleRoleSelect("patient");
                }}
                disabled={loading}
                aria-label="Select Patient Role"
              >
                {loading && selectedRole === "patient" ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Setting Patient Role...
                  </>
                ) : (
                  "Select Patient Role"
                )}
              </button>
            </div>
          </div>

          {/* Researcher Card */}
          <div
            className={`w-full md:w-1/2 bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 ${
              selectedRole === "researcher" ? "ring-2 ring-purple-500" : ""
            } ${loading ? "opacity-75 pointer-events-none" : ""}`}
            onClick={() => !loading && handleRoleSelect("researcher")}
          >
            <div className="p-8 flex flex-col items-center gap-4 h-full">
              <div className="bg-purple-50 p-4 rounded-full">
                <Microscope className="w-12 h-12 text-purple-500" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800">
                Researcher
              </h2>
              <p className="text-sm text-gray-600 text-center leading-relaxed flex-grow">
                Access and analyze anonymized health data for research purposes.
                Discover patterns, conduct studies, and contribute to medical
                advancements with blockchain-verified data integrity.
              </p>
              <button
                className={`w-full bg-purple-500 hover:bg-purple-600 text-white font-medium py-3 px-4 rounded-lg transition-colors mt-2 flex items-center justify-center ${
                  loading ? "opacity-75 cursor-not-allowed" : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  !loading && handleRoleSelect("researcher");
                }}
                disabled={loading}
                aria-label="Select Researcher Role"
              >
                {loading && selectedRole === "researcher" ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Setting Researcher Role...
                  </>
                ) : (
                  "Select Researcher Role"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleSelector;