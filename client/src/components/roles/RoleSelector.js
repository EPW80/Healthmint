// src/components/roles/RoleSelector.js
import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { User, Microscope, Loader, AlertCircle } from "lucide-react";
import { setRole, selectIsRoleSelected } from "../../redux/slices/roleSlice.js";
import { addNotification } from "../../redux/slices/notificationSlice.js";
import { updateUserProfile } from "../../redux/slices/userSlice.js";
import hipaaComplianceService from "../../services/hipaaComplianceService.js";

/**
 * Role Selector Component with improved navigation
 */
const RoleSelector = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isRoleSelected = useSelector(selectIsRoleSelected);

  // Local state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [redirecting, setRedirecting] = useState(false);

  // Track when we've already redirected to avoid loops
  const [hasRedirected, setHasRedirected] = useState(false);

  // Check if we already have a role and redirect if needed
  useEffect(() => {
    if (isRoleSelected && !redirecting && !hasRedirected) {
      console.log("Role already selected, redirecting to dashboard");
      setHasRedirected(true);
      navigate("/dashboard", { replace: true });
    }
  }, [isRoleSelected, redirecting, hasRedirected, navigate]);

  /**
   * Handle role selection with improved navigation
   */
  const handleRoleSelect = async (role) => {
    try {
      // Prevent multiple submissions
      if (loading) return;

      setLoading(true);
      setError(null);
      setSelectedRole(role);
      setRedirecting(true);

      console.log(`Setting role: ${role}`); // Debug log

      // Audit role selection for HIPAA compliance
      await hipaaComplianceService.createAuditLog("ROLE_SELECTION", {
        role,
        timestamp: new Date().toISOString(),
        action: "SELECT",
      });

      // Dispatch role selection action to Redux
      dispatch(setRole(role));

      // Update user profile with role information
      dispatch(
        updateUserProfile({
          role,
          lastUpdated: new Date().toISOString(),
        })
      );

      // Success notification
      dispatch(
        addNotification({
          type: "success",
          message: `Successfully set role as ${role === "patient" ? "Patient" : "Researcher"}`,
          duration: 3000,
        })
      );

      // Save role selection directly to localStorage as a backup
      localStorage.setItem("healthmint_user_role", role);

      // Redirect to the appropriate dashboard using React Router's navigate
      console.log(`Redirecting to dashboard for role: ${role}`);

      // Use React Router's navigate for a cleaner SPA experience
      setTimeout(() => {
        setHasRedirected(true);
        navigate("/dashboard", { replace: true });
      }, 500);
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
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      {error && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-md flex items-center gap-2">
          <AlertCircle size={20} className="flex-shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
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
