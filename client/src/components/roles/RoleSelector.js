// src/components/roles/RoleSelector.js
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { User, Microscope, Loader } from "lucide-react";
import { setRole } from "../../redux/slices/roleSlice.js";
import { selectAuth, updateUserRoles } from "../../redux/slices/authSlice.js";
import { addNotification } from "../../redux/slices/notificationSlice.js";
import apiService from "../../services/apiService.js";
import useNavigation from "../../hooks/useNavigation.js";

const RoleSelector = () => {
  const dispatch = useDispatch();
  const { navigateTo } = useNavigation();

  // Get authentication state from Redux
  const auth = useSelector(selectAuth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if user already has a role
  useEffect(() => {
    const checkExistingRole = async () => {
      try {
        // If user is authenticated and has roles, check if they already have a role
        if (
          auth.isAuthenticated &&
          auth.userRoles &&
          auth.userRoles.length > 0
        ) {
          // If user already has a role, set it in Redux and redirect to dashboard
          const primaryRole = auth.userRoles[0]; // Assume first role is primary
          dispatch(setRole(primaryRole));
          navigateTo("/dashboard");
        }
      } catch (err) {
        console.error("Error checking existing role:", err);
      }
    };

    checkExistingRole();
  }, [auth.isAuthenticated, auth.userRoles, dispatch, navigateTo]);

  const handleRoleSelect = async (role) => {
    try {
      setLoading(true);
      setError(null);

      // 1. Set role in Redux store
      dispatch(setRole(role));

      // 2. Send the role selection to the backend to update user profile
      const response = await apiService.post("/api/user/role", { role });

      // 3. Update user roles in auth state
      if (response && response.success) {
        dispatch(
          updateUserRoles([role, ...auth.userRoles.filter((r) => r !== role)])
        );

        // Show success notification
        dispatch(
          addNotification({
            type: "success",
            message: `Successfully set role as ${role === "patient" ? "Patient" : "Researcher"}`,
            duration: 3000,
          })
        );

        // 4. Navigate to dashboard
        navigateTo("/dashboard");
      } else {
        throw new Error(response?.message || "Failed to update role");
      }
    } catch (err) {
      console.error("Role selection error:", err);
      setError(err.message || "Failed to set role. Please try again.");

      dispatch(
        addNotification({
          type: "error",
          message: err.message || "Failed to set role. Please try again.",
          duration: 5000,
        })
      );
    } finally {
      setLoading(false);
    }
  };

  if (!auth.isAuthenticated) {
    // Redirect to login if not authenticated
    navigateTo("/login");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      {error && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-md">
          {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 justify-center items-center max-w-4xl w-full">
        {/* Patient Card */}
        <div
          className="w-full md:w-72 bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
          onClick={() => !loading && handleRoleSelect("patient")}
        >
          <div className="p-8 flex flex-col items-center gap-4">
            <div className="bg-blue-50 p-4 rounded-full">
              <User className="w-12 h-12 text-blue-500" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-800">Patient</h2>
            <p className="text-sm text-gray-600 text-center leading-relaxed">
              Share and manage your health data securely on the blockchain
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
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Setting Role...
                </>
              ) : (
                "Select Patient Role"
              )}
            </button>
          </div>
        </div>

        {/* Researcher Card */}
        <div
          className="w-full md:w-72 bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
          onClick={() => !loading && handleRoleSelect("researcher")}
        >
          <div className="p-8 flex flex-col items-center gap-4">
            <div className="bg-purple-50 p-4 rounded-full">
              <Microscope className="w-12 h-12 text-purple-500" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-800">Researcher</h2>
            <p className="text-sm text-gray-600 text-center leading-relaxed">
              Access and analyze anonymized health data for research purposes
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
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Setting Role...
                </>
              ) : (
                "Select Researcher Role"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleSelector;
