// client/src/components/dashboard/RoleSwitcher.js
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { User, Microscope, Loader, AlertCircle } from "lucide-react";
import { setRole } from "../../redux/slices/roleSlice.js";
import { addNotification } from "../../redux/slices/notificationSlice.js";
import { updateUserProfile } from "../../redux/slices/userSlice.js";
import hipaaComplianceService from "../../services/hipaaComplianceService.js";
import authService from "../../services/authService.js";
import authUtils from "../../utils/authUtils.js";

/**
 * Role Switcher Component for the Dashboard
 * Allows users to switch between patient and researcher roles
 */
const RoleSwitcher = () => {
  const dispatch = useDispatch();
  const currentRole = useSelector((state) => state.role.role);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);

  /**
   * Handle role switch - reusing logic from the original RoleSelector
   */
  const handleRoleSwitch = async (role) => {
    // If already selected or in process, do nothing
    if (role === currentRole || loading) return;
    
    try {
      setLoading(true);
      setError(null);
      setSelectedRole(role);
      
      console.log(`Switching role to: ${role}`);
      
      // Audit role selection for HIPAA compliance
      await hipaaComplianceService.createAuditLog("ROLE_SWITCH", {
        fromRole: currentRole,
        toRole: role,
        timestamp: new Date().toISOString(),
        action: "SWITCH",
      });

      // Get current user data to merge with role
      const userData = authService.getCurrentUser() || {};
      const walletAddress = userData.address || localStorage.getItem("healthmint_wallet_address");

      if (!walletAddress) {
        throw new Error("Wallet address not found. Please reconnect your wallet.");
      }

      const updatedUserData = {
        ...userData,
        role,
        address: walletAddress,
        lastUpdated: new Date().toISOString(),
      };

      // Update user data in authService
      authService.updateUserData?.(updatedUserData) || 
        authUtils.forceRegistrationComplete?.(role, walletAddress, updatedUserData);

      // Explicitly set in localStorage
      localStorage.setItem("healthmint_user_role", role);

      // Dispatch role selection action to Redux
      dispatch(setRole(role));

      // Update user profile with role information
      dispatch(updateUserProfile(updatedUserData));

      // Success notification
      dispatch(
        addNotification({
          type: "success",
          message: `Switched to ${role === "patient" ? "Patient" : "Researcher"} view`,
          duration: 3000,
        })
      );

    } catch (err) {
      console.error("Role switch error:", err);
      setError(err.message || "Failed to switch role. Please try again.");

      dispatch(
        addNotification({
          type: "error",
          message: err.message || "Failed to switch role. Please try again.",
        })
      );

    } finally {
      setLoading(false);
      setSelectedRole(null);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {error && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-md flex items-center gap-2 z-50">
          <AlertCircle size={20} className="flex-shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}
      
      <span className="text-sm text-gray-500 mr-2">View as:</span>
      
      {/* Patient Role Button */}
      <button
        className={`flex items-center px-3 py-1.5 text-sm rounded-md transition-colors ${
          currentRole === "patient"
            ? "bg-blue-100 text-blue-700"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
        onClick={() => !loading && handleRoleSwitch("patient")}
        disabled={loading || currentRole === "patient"}
        aria-label="Switch to Patient view"
      >
        <User className="w-4 h-4 mr-1.5" />
        Patient
        {loading && selectedRole === "patient" && (
          <Loader className="w-3 h-3 ml-1.5 animate-spin" />
        )}
      </button>
      
      {/* Researcher Role Button */}
      <button
        className={`flex items-center px-3 py-1.5 text-sm rounded-md transition-colors ${
          currentRole === "researcher"
            ? "bg-purple-100 text-purple-700"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
        onClick={() => !loading && handleRoleSwitch("researcher")}
        disabled={loading || currentRole === "researcher"}
        aria-label="Switch to Researcher view"
      >
        <Microscope className="w-4 h-4 mr-1.5" />
        Researcher
        {loading && selectedRole === "researcher" && (
          <Loader className="w-3 h-3 ml-1.5 animate-spin" />
        )}
      </button>
    </div>
  );
};

export default RoleSwitcher;