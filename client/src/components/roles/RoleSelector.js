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
import { STORAGE_KEYS } from "../../config/storageKeys.js";

const RoleSelector = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const walletAddress = useSelector((state) => state.wallet.address);
  const isWalletConnected = useSelector((state) => state.wallet.isConnected);

  // Local state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  // Guard: redirect to login if wallet disconnects while on this page.
  useEffect(() => {
    if (isLogoutInProgress()) {
      console.log("RoleSelector: Logout in progress, redirecting to login");
      navigate("/login", { replace: true });
      return;
    }

    if (!isWalletConnected || !walletAddress) {
      console.log("RoleSelector: No wallet connection, redirecting to login");
      navigate("/login", { replace: true });
    }
  }, [navigate, isWalletConnected, walletAddress]);

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

      const userProfile = authService.getCurrentUser();
      if (userProfile?.role) {
        console.log(`RoleSelector: Found role in profile: ${userProfile.role}`);
        dispatch(setRole(userProfile.role));
        return true;
      }

      const storedRole = localStorage.getItem(STORAGE_KEYS.USER_ROLE);
      if (storedRole) {
        console.log(`RoleSelector: Found role in localStorage: ${storedRole}`);
        dispatch(setRole(storedRole));
        return true;
      }

      return false;
    };

    const hasRole = checkExistingRole();
    if (hasRole && !isRedirecting) {
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
      STORAGE_KEYS.WALLET_ADDRESS
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
        sessionStorage.setItem("temp_selected_role", role);

        await hipaaComplianceService.createAuditLog("ROLE_SELECTION", {
          role,
          timestamp: new Date().toISOString(),
          action: "SELECT",
        });

        const currentWalletAddress =
          walletAddress || localStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS);
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

        localStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
        localStorage.setItem(STORAGE_KEYS.IS_NEW_USER, "false");
        localStorage.setItem(STORAGE_KEYS.WALLET_CONNECTION, "true");

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
        sessionStorage.removeItem("temp_selected_role");
        setIsLoading(false);
        setIsRedirecting(false);
      }
    },
    [dispatch, isLoading, navigate, walletAddress]
  );

  // Render role card
  const renderRoleCard = (role, Icon, description) => {
    const isSelected = selectedRole === role;
    const label = role === "patient" ? "Patient" : "Researcher";
    return (
      <div
        className={`w-full md:w-1/2 bg-surface rounded-token-lg border transition-colors ${
          isSelected
            ? "border-accent ring-2 ring-accent shadow-soft-md"
            : "border-line shadow-soft-sm hover:border-line-strong hover:shadow-soft-md"
        } ${isLoading ? "opacity-75 pointer-events-none" : ""}`}
      >
        <div className="p-8 flex flex-col items-center gap-4 h-full">
          <div className="bg-accent/10 text-accent p-4 rounded-full">
            <Icon className="w-10 h-10" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold text-fg">{label}</h2>
          <p className="text-sm text-fg-muted text-center leading-relaxed flex-grow">
            {description}
          </p>
          <button
            className="w-full bg-accent hover:bg-accent-hover disabled:opacity-60 disabled:cursor-not-allowed text-accent-fg font-medium py-2.5 px-4 rounded-token transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-page"
            onClick={() => !isLoading && handleRoleSelect(role)}
            disabled={isLoading}
            aria-label={`Select ${label} Role`}
          >
            {isLoading && selectedRole === role ? (
              <>
                <Loader
                  className="w-4 h-4 animate-spin"
                  aria-hidden="true"
                />
                Setting {label} Role...
              </>
            ) : (
              `Select ${label} Role`
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-page p-6">
      <div className="absolute top-4 right-4">
        <LogoutButton
          variant="text"
          size="sm"
          className="text-fg-muted hover:text-fg"
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
          <h1 className="text-2xl font-bold text-fg mb-2">Choose Your Role</h1>
          <p className="text-fg-muted text-sm">
            Select how you want to use the Healthmint platform
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-6 justify-center items-stretch">
          {renderRoleCard(
            "patient",
            User,
            "Share and manage your health data securely on the blockchain. Control access to your records and potentially earn rewards for contributing to medical research."
          )}
          {renderRoleCard(
            "researcher",
            Microscope,
            "Access and analyze anonymized health data for research purposes. Discover patterns, conduct studies, and contribute to medical advancements with blockchain-verified data integrity."
          )}
        </div>
      </div>
    </div>
  );
};

export default RoleSelector;
