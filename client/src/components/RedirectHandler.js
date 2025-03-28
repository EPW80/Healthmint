// src/components/RedirectHandler.js
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { selectRole, selectIsRoleSelected } from "../redux/slices/roleSlice";
import { addNotification } from "../redux/slices/notificationSlice";

/**
 * RedirectHandler Component
 *
 * Handles automatic redirection based on application state
 * Specifically manages the flow after registration and role selection
 */
const RedirectHandler = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Get current role state
  const userRole = useSelector(selectRole);
  const isRoleSelected = useSelector(selectIsRoleSelected);

  useEffect(() => {
    // Check if we're at the root path and need redirection
    const currentPath = window.location.pathname;

    // Log the current state for debugging
    console.log("RedirectHandler: Current state", {
      currentPath,
      isRoleSelected,
      userRole,
    });

    // Handle redirection logic
    const handleRedirect = () => {
      try {
        // If at the dashboard with a selected role, no redirect needed
        if (currentPath === "/dashboard" && isRoleSelected) {
          console.log(`Already at dashboard with role: ${userRole}`);
          return;
        }

        // If role is selected but not at dashboard, redirect there
        if (isRoleSelected && currentPath !== "/dashboard") {
          console.log(`Role ${userRole} selected, redirecting to dashboard`);
          navigate("/dashboard", { replace: true });

          dispatch(
            addNotification({
              type: "success",
              message: `Welcome to your ${userRole === "patient" ? "Patient" : "Researcher"} Dashboard`,
              duration: 3000,
            })
          );
          return;
        }

        // If no role is selected and not at the role selector, redirect to role selector
        if (
          !isRoleSelected &&
          currentPath !== "/select-role" &&
          currentPath !== "/login" &&
          currentPath !== "/register"
        ) {
          console.log("No role selected, redirecting to role selector");
          navigate("/select-role", { replace: true });
          return;
        }
      } catch (error) {
        console.error("Redirection error:", error);
      }
    };

    // Execute the redirect logic
    handleRedirect();
  }, [isRoleSelected, userRole, navigate, dispatch]);

  // This component doesn't render anything
  return null;
};

export default RedirectHandler;
