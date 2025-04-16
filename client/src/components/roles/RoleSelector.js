// src/components/roles/RoleSelector.js
import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { User, Microscope, Loader } from "lucide-react";
import LogoutButton from "../LogoutButton.js";
import WalletErrorNotification from "../WalletErrorNotification.js";
import { setRole } from "../../redux/slices/roleSlice.js";
import { addNotification } from "../../redux/slices/notificationSlice.js";
import { updateUserProfile } from "../../redux/slices/userSlice.js";
import hipaaComplianceService from "../../services/hipaaComplianceService.js";
import authService from "../../services/authService.js";
import authUtils from "../../utils/authUtils.js";
import { isLogoutInProgress } from "../../utils/authLoopPrevention.js";

const RoleSelector = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const walletAddress = useSelector((state) => state.wallet.address);

  // Local state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  // Check logout and wallet connection status
  useEffect(() => {
    if (isLogoutInProgress()) {
      console.log("RoleSelector: Logout in progress, redirecting to login");
      navigate("/login", { replace: true });
      return;
    }

    const isWalletConnected =
      localStorage.getItem("healthmint_wallet_connection") === "true";
    const hasWalletAddress = !!localStorage.getItem(
      "healthmint_wallet_address"
    );

    if (!isWalletConnected || !hasWalletAddress) {
      console.log("RoleSelector: No wallet connection, redirecting to login");
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  // Check for existing role and redirect if found
  useEffect(() => {
    if (isRedirecting || initialCheckDone) return;

    const checkExistingRole = () => {
      console.log("RoleSelector: Checking for existing role...");

      const fromPath = location.state?.from;
      if (fromPath === "/dashboard") {
        console.log("RoleSelector: From dashboard, skipping redirect");
        return false;
      }

      if (sessionStorage.getItem("bypass_role_check") === "true") {
        console.log("RoleSelector: Bypassing role check");
        sessionStorage.removeItem("bypass_role_check");
        return false;
      }

      const userProfile = authService.getCurrentUser();
      if (userProfile?.role) {
        console.log(`RoleSelector: Found role in profile: ${userProfile.role}`);
        dispatch(setRole(userProfile.role));
        return true;
      }

      const storedRole = localStorage.getItem("healthmint_user_role");
      if (storedRole) {
        console.log(`RoleSelector: Found role in localStorage: ${storedRole}`);
        dispatch(setRole(storedRole));
        return true;
      }

      return false;
    };

    const hasRole = checkExistingRole();
    if (hasRole && !isRedirecting) {
      sessionStorage.setItem("bypass_route_protection", "true");
      setIsRedirecting(true);
      setInitialCheckDone(true);
      navigate("/dashboard", { replace: true });
    } else {
      setInitialCheckDone(true);
    }
  }, [dispatch, navigate, isRedirecting, location.state, initialCheckDone]);

  // Validate wallet address
  useEffect(() => {
    const localStorageAddress = localStorage.getItem(
      "healthmint_wallet_address"
    );
    if (!walletAddress && !localStorageAddress) {
      setError("Wallet address not found. Please reconnect your wallet.");
    } else if (
      error === "Wallet address not found. Please reconnect your wallet."
    ) {
      setError(null);
    }
  }, [walletAddress, error]);

  // Handle role selection
  const handleRoleSelect = useCallback(
    async (role) => {
      if (isLoading) return;

      setIsLoading(true);
      setError(null);
      setSelectedRole(role);
      setIsRedirecting(true);

      try {
        console.log(`RoleSelector: Setting role: ${role}`);
        sessionStorage.setItem("bypass_route_protection", "true");
        sessionStorage.setItem("temp_selected_role", role);

        await hipaaComplianceService.createAuditLog("ROLE_SELECTION", {
          role,
          timestamp: new Date().toISOString(),
          action: "SELECT",
        });

        const currentWalletAddress =
          walletAddress || localStorage.getItem("healthmint_wallet_address");
        if (!currentWalletAddress) {
          throw new Error(
            "Wallet address not found. Please reconnect your wallet."
          );
        }

        const userData = authService.getCurrentUser() || {};
        const updatedUserData = {
          ...userData,
          name: userData.name || "User",
          role,
          address: currentWalletAddress,
          lastUpdated: new Date().toISOString(),
        };

        const registrationSuccess = authUtils.forceRegistrationComplete(
          role,
          currentWalletAddress,
          updatedUserData
        );
        if (!registrationSuccess) {
          console.error(
            "RoleSelector: Registration via authUtils failed, using fallback"
          );
          authService.completeRegistration(updatedUserData);
        }

        localStorage.setItem("healthmint_user_role", role);
        localStorage.setItem("healthmint_is_new_user", "false");
        localStorage.setItem("healthmint_wallet_connection", "true");

        dispatch(setRole(role));
        dispatch(updateUserProfile(updatedUserData));
        dispatch(
          addNotification({
            type: "success",
            message: `Successfully set role as ${role === "patient" ? "Patient" : "Researcher"}`,
            duration: 3000,
          })
        );

        navigate("/dashboard", {
          replace: true,
          state: { roleJustSelected: true },
        });
      } catch (err) {
        console.error("RoleSelector: Role selection error:", err);
        setError(err.message || "Failed to set role. Please try again.");
        dispatch(
          addNotification({
            type: "error",
            message: err.message || "Failed to set role. Please try again.",
            duration: 3000,
          })
        );
        sessionStorage.removeItem("bypass_route_protection");
        sessionStorage.removeItem("temp_selected_role");
        setIsLoading(false);
        setIsRedirecting(false);
      }
    },
    [dispatch, isLoading, navigate, walletAddress]
  );

  // Render role card
  const renderRoleCard = (role, icon, color, description) => (
    <div
      className={`w-full md:w-1/2 bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 ${
        selectedRole === role ? `ring-2 ring-${color}-500` : ""
      } ${isLoading ? "opacity-75 pointer-events-none" : ""}`}
      onClick={() => !isLoading && handleRoleSelect(role)}
    >
      <div className="p-8 flex flex-col items-center gap-4 h-full">
        <div className={`bg-${color}-50 p-4 rounded-full`}>{icon}</div>
        <h2 className="text-2xl font-semibold text-gray-800">
          {role === "patient" ? "Patient" : "Researcher"}
        </h2>
        <p className="text-sm text-gray-600 text-center leading-relaxed flex-grow">
          {description}
        </p>
        <button
          className={`w-full bg-${color}-500 hover:bg-${color}-600 text-white font-medium py-3 px-4 rounded-lg transition-colors mt-2 flex items-center justify-center ${
            isLoading ? "opacity-75 cursor-not-allowed" : ""
          }`}
          onClick={(e) => {
            e.stopPropagation();
            !isLoading && handleRoleSelect(role);
          }}
          disabled={isLoading}
          aria-label={`Select ${role} Role`}
        >
          {isLoading && selectedRole === role ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Setting {role === "patient" ? "Patient" : "Researcher"} Role...
            </>
          ) : (
            `Select ${role === "patient" ? "Patient" : "Researcher"} Role`
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="absolute top-4 right-4">
        <LogoutButton
          variant="text"
          size="sm"
          className="text-gray-600 hover:text-gray-800"
        />
      </div>
      {error?.includes("Wallet address not found") && (
        <WalletErrorNotification
          message={error}
          isVisible={true}
          onClose={() => setError(null)}
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
          {renderRoleCard(
            "patient",
            <User className="w-12 h-12 text-blue-500" />,
            "blue",
            "Share and manage your health data securely on the blockchain. Control access to your records and potentially earn rewards for contributing to medical research."
          )}
          {renderRoleCard(
            "researcher",
            <Microscope className="w-12 h-12 text-purple-500" />,
            "purple",
            "Access and analyze anonymized health data for research purposes. Discover patterns, conduct studies, and contribute to medical advancements with blockchain-verified data integrity."
          )}
        </div>
      </div>
    </div>
  );
};

export default RoleSelector;