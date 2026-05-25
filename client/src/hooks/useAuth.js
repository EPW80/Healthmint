// src/hooks/useAuth.js
import { useState, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import { setRole } from "../redux/slices/roleSlice.js";
import { updateUserProfile } from "../redux/slices/userSlice.js";
import authService from "../services/authService.js";
import { isLogoutInProgress } from "../utils/authLoopPrevention.js";
import hipaaComplianceService from "../services/hipaaComplianceService.js";
import { STORAGE_KEYS } from "../config/storageKeys.js";

const useAuth = () => {
  const dispatch = useDispatch();

  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isRegistrationComplete, setIsRegistrationComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userIdentity, setUserIdentity] = useState(null);

  // Refs for verification state management
  const isVerifyingRef = useRef(false);
  const verificationCacheTimeoutRef = useRef(null);
  const verificationCacheRef = useRef(null);

  const clearVerificationCache = useCallback(() => {
    verificationCacheRef.current = null;

    if (verificationCacheTimeoutRef.current) {
      clearTimeout(verificationCacheTimeoutRef.current);
      verificationCacheTimeoutRef.current = null;
    }
  }, []);

  const verifyAuth = useCallback(async () => {
    // Skip verification if there's a logout in progress
    if (isLogoutInProgress()) {
      console.log("Auth verification skipped due to logout in progress");
      setIsAuthenticated(false);
      setIsNewUser(false);
      setIsRegistrationComplete(false);
      return {
        isAuthenticated: false,
        isNewUser: false,
        isRegistrationComplete: false,
      };
    }

    // Return cached verification if available and recent
    if (verificationCacheRef.current) {
      return verificationCacheRef.current;
    }

    // Prevent concurrent verifications
    if (isVerifyingRef.current) {
      console.log("Auth verification already in progress");
      return null;
    }

    isVerifyingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      if (typeof authService.verifyAuth === "function") {
        const result = await authService.verifyAuth();
        // Check if result is null or undefined
        if (!result) {
          throw new Error(
            "Authentication verification failed: no result returned from authService"
          );
        }
        // Now safe to access result properties
        setIsAuthenticated(result.isAuthenticated);
        setIsNewUser(result.isNewUser);
        setIsRegistrationComplete(result.isRegistrationComplete);

        if (result.userProfile) {
          setUserIdentity(result.userProfile);
          // Update Redux state with user profile and role
          dispatch(updateUserProfile(result.userProfile));
          if (result.userProfile.role) {
            dispatch(setRole(result.userProfile.role));
          }
        }

        // Cache the verification result briefly to prevent repeated calls
        verificationCacheRef.current = result;

        // Clear cache after a short period
        if (verificationCacheTimeoutRef.current) {
          clearTimeout(verificationCacheTimeoutRef.current);
        }

        verificationCacheTimeoutRef.current = setTimeout(() => {
          verificationCacheRef.current = null;
        }, 5000);

        // Create HIPAA-compliant audit log for auth verification
        await hipaaComplianceService.createAuditLog("AUTH_VERIFICATION", {
          timestamp: new Date().toISOString(),
          result: result.isAuthenticated ? "AUTHENTICATED" : "UNAUTHENTICATED",
          isNewUser: result.isNewUser,
          isRegistrationComplete: result.isRegistrationComplete,
        });

        setLoading(false);
        isVerifyingRef.current = false;

        return result;
      }

      // Fallback implementation if function doesn't exist (shouldn't happen after our patch)
      console.warn("Using fallback auth verification in useAuth hook");

      const walletAddress = localStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS);
      const isWalletConnected =
        localStorage.getItem(STORAGE_KEYS.WALLET_CONNECTION) === "true";

      if (!walletAddress || !isWalletConnected) {
        setIsAuthenticated(false);
        setIsRegistrationComplete(false);
        setIsNewUser(false);
        clearVerificationCache();

        setLoading(false);
        isVerifyingRef.current = false;

        return null;
      }

      const userData = authService.getCurrentUser
        ? authService.getCurrentUser()
        : null;

      if (!userData) {
        setIsAuthenticated(false);
        setIsRegistrationComplete(false);
        setIsNewUser(false);
        clearVerificationCache();

        setLoading(false);
        isVerifyingRef.current = false;

        return null;
      }

      const storedRole = localStorage.getItem(STORAGE_KEYS.USER_ROLE);
      const isUserNew =
        localStorage.getItem(STORAGE_KEYS.IS_NEW_USER) === "true";

      // Update state based on the verification
      setIsAuthenticated(true);
      setIsNewUser(isUserNew);
      setIsRegistrationComplete(!isUserNew);

      const result = {
        ...userData,
        isAuthenticated: true,
        isNewUser: isUserNew,
        isRegistrationComplete: !isUserNew,
        role: storedRole || null,
        userProfile: userData,
      };

      // Cache the result
      verificationCacheRef.current = result;

      if (verificationCacheTimeoutRef.current) {
        clearTimeout(verificationCacheTimeoutRef.current);
      }

      verificationCacheTimeoutRef.current = setTimeout(() => {
        verificationCacheRef.current = null;
      }, 5000);

      // Log verification
      await hipaaComplianceService.createAuditLog(
        "AUTH_VERIFICATION_FALLBACK",
        {
          timestamp: new Date().toISOString(),
          result: "AUTHENTICATED",
          isNewUser: isUserNew,
          walletAddress,
        }
      );

      // Update Redux if needed
      dispatch(updateUserProfile(userData));
      if (storedRole) {
        dispatch(setRole(storedRole));
      }

      setLoading(false);
      isVerifyingRef.current = false;

      return result;
    } catch (err) {
      console.error("Auth verification error:", err);
      setError(err.message || "Failed to verify authentication");

      // Create HIPAA-compliant audit log for auth verification error
      await hipaaComplianceService.createAuditLog("AUTH_VERIFICATION_ERROR", {
        timestamp: new Date().toISOString(),
        error: err.message || "Unknown error",
      });

      setLoading(false);
      isVerifyingRef.current = false;

      // Clear any cached verification on error
      verificationCacheRef.current = null;

      // Return default error state
      return {
        isAuthenticated: false,
        isNewUser: false,
        isRegistrationComplete: false,
        error: err.message || "Authentication verification failed",
      };
    }
  }, [dispatch, clearVerificationCache]);

  const login = async (walletAddress) => {
    try {
      setLoading(true);
      console.log("Login attempt with wallet:", walletAddress);

      // Make sure address is properly formatted with 0x prefix
      const formattedAddress = walletAddress.startsWith("0x")
        ? walletAddress
        : `0x${walletAddress}`;

      // Step 1: request a challenge message from the server.
      const challengeRes = await fetch("/api/auth/wallet/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: formattedAddress }),
      });
      const challengeData = await challengeRes.json();
      if (!challengeRes.ok) {
        throw new Error(challengeData.message || "Failed to get challenge");
      }
      const { challengeMessage } = challengeData;

      // Step 2: ask the wallet to sign the challenge (EIP-191 personal_sign).
      if (!window.ethereum) {
        throw new Error("No wallet detected. Install MetaMask to continue.");
      }
      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [challengeMessage, formattedAddress],
      });

      // Step 3: exchange the signed challenge for a JWT.
      const authRes = await fetch("/api/auth/wallet/authenticate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: formattedAddress,
          signature,
          message: challengeMessage,
        }),
      });
      const data = await authRes.json();
      if (!authRes.ok) {
        throw new Error(data.message || "Authentication failed");
      }
      // A 200 with no token is a server bug — fail loudly rather than
      // silently writing `undefined` into authService.token, which makes
      // isAuthenticated() return false on every subsequent API call.
      if (!data.token) {
        throw new Error(
          "Authentication response did not include a token. Check server logs."
        );
      }

      // Persist the JWT in the auth service (in-memory) so verifyAuth works
      authService.updateAuthState({
        token: data.token,
        refreshToken: data.refreshToken ?? null,
        expiresAt: null,
        userProfile: data.user ?? null,
        isNewUser: data.isNewUser ?? false,
      });

      // Update this hook's local state
      const isNew = data.isNewUser ?? false;
      setIsAuthenticated(true);
      setIsNewUser(isNew);
      setIsRegistrationComplete(!!data.user && !isNew);
      if (data.user) {
        setUserIdentity(data.user);
        dispatch(updateUserProfile(data.user));
        const role = data.user.roles?.[0] ?? data.user.role;
        if (role) dispatch(setRole(role));
      }

      return {
        success: true,
        isNewUser: isNew,
        isRegistrationComplete: !!data.user && !isNew,
        userProfile: data.user ?? null,
        token: data.token,
      };
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message);
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  const completeRegistration = useCallback(
    async (userData) => {
      if (!userData || !userData.role) {
        setError("User data and role are required for registration");
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        // Update authentication state
        setIsAuthenticated(true);
        setIsNewUser(false);
        setIsRegistrationComplete(true);
        setUserIdentity(userData);

        // Update Redux state
        dispatch(updateUserProfile(userData));
        dispatch(setRole(userData.role));

        // Create HIPAA-compliant audit log for registration
        await hipaaComplianceService.createAuditLog("REGISTRATION_COMPLETED", {
          timestamp: new Date().toISOString(),
          role: userData.role,
          userId: userData.address || userData.id,
        });

        clearVerificationCache();
        setLoading(false);
        return true;
      } catch (err) {
        console.error("Registration error:", err);
        setError(err.message || "Failed to complete registration");

        // Create HIPAA-compliant audit log for registration error
        await hipaaComplianceService.createAuditLog("REGISTRATION_ERROR", {
          timestamp: new Date().toISOString(),
          error: err.message || "Unknown error",
          userId: userData.address || userData.id,
        });

        setLoading(false);
        return false;
      }
    },
    [dispatch, clearVerificationCache]
  );

  const register = useCallback(
    async (userData) => {
      if (!userData || !userData.address) {
        setError("User data and wallet address are required for registration");
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        // Call authentication service to register the user
        setIsAuthenticated(true);
        setIsNewUser(false);
        setIsRegistrationComplete(true);
        setUserIdentity(userData);

        // Update Redux state
        dispatch(updateUserProfile(userData));

        if (userData.role) {
          dispatch(setRole(userData.role));
        }

        // Create HIPAA-compliant audit log for registration
        await hipaaComplianceService.createAuditLog("USER_REGISTERED", {
          timestamp: new Date().toISOString(),
          walletAddress: userData.address,
          role: userData.role || "unspecified",
        });

        // Clear any cached verification after registration
        clearVerificationCache();

        setLoading(false);
        return true;
      } catch (err) {
        console.error("Registration error:", err);
        setError(err.message || "Failed to register user");

        // Create HIPAA-compliant audit log for registration error
        await hipaaComplianceService.createAuditLog("REGISTRATION_ERROR", {
          timestamp: new Date().toISOString(),
          error: err.message || "Unknown error",
          walletAddress: userData.address,
        });

        setLoading(false);
        return false;
      }
    },
    [dispatch, clearVerificationCache]
  );

  // Return the auth hook API
  return {
    isAuthenticated,
    isNewUser,
    isRegistrationComplete,
    loading,
    error,
    userIdentity,
    login,
    register,
    completeRegistration,
    verifyAuth,
    clearVerificationCache,
    clearError: () => setError(null),
  };
};

export default useAuth;
