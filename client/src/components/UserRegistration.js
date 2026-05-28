// src/components/UserRegistration.js
import React, { useState, useCallback, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Save,
  User,
  Briefcase,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { Button } from "./ui/index.js";
import HashDisplay from "./ui/HashDisplay.js";
import { setRole } from "../redux/slices/roleSlice.js";
import { addNotification } from "../redux/slices/notificationSlice.js";
import { updateUserProfile } from "../redux/slices/userSlice.js";
import hipaaComplianceService from "../services/hipaaComplianceService.js";
import authService from "../services/authService.js";
import useAuth from "../hooks/useAuth.js";

const STEP_LABELS = ["Role", "Info", "Consent"];

const UserRegistration = ({ walletAddress, onComplete }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { register } = useAuth();

  // Form state
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    age: "",
    role: "",
    agreeToTerms: false,
    agreeToHipaa: false,
    address: walletAddress || "",
  });

  // Registration step state
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [registrationSuccessful, setRegistrationSuccessful] = useState(false);
  const stepHeadingRef = useRef(null);

  // Check for existing wallet address on mount and update form state
  useEffect(() => {
    if (walletAddress && formState.address !== walletAddress) {
      setFormState((prev) => ({ ...prev, address: walletAddress }));
    }
  }, [walletAddress, formState.address]);

  // Redirect if registration is already successful
  useEffect(() => {
    if (registrationSuccessful) {
      const timer = setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [registrationSuccessful, navigate]);

  // Move focus to step heading for screen-reader context
  useEffect(() => {
    if (stepHeadingRef.current) {
      stepHeadingRef.current.focus();
    }
  }, [step]);

  // Handle input changes
  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormState((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }, []);

  // Handle role selection
  const handleRoleSelect = useCallback((role) => {
    setSelectedRole(role);
    setFormState((prev) => ({
      ...prev,
      role,
    }));
  }, []);

  const nextStep = useCallback(() => {
    hipaaComplianceService.createAuditLog("REGISTRATION_STEP_CHANGE", {
      previousStep: step,
      nextStep: step + 1,
      timestamp: new Date().toISOString(),
    });

    setStep((prevStep) => prevStep + 1);
  }, [step]);

  // Move to previous step
  const prevStep = useCallback(() => {
    hipaaComplianceService.createAuditLog("REGISTRATION_STEP_CHANGE", {
      previousStep: step,
      nextStep: step - 1,
      timestamp: new Date().toISOString(),
    });

    setStep((prevStep) => Math.max(1, prevStep - 1));
  }, [step]);

  // Create HIPAA consent
  const createHipaaConsent = useCallback(async () => {
    try {
      await hipaaComplianceService.recordConsent(
        hipaaComplianceService.CONSENT_TYPES.DATA_SHARING,
        true,
        {
          userId: walletAddress,
          walletAddress: walletAddress,
          timestamp: new Date().toISOString(),
          ip: "client-collected",
          details: "Initial user registration consent",
          registrationFlow: true,
        }
      );

      await hipaaComplianceService.createAuditLog("REGISTRATION_CONSENT", {
        userId: walletAddress,
        walletAddress: walletAddress,
        consentType: "HIPAA_DATA_SHARING",
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error("Error recording HIPAA consent:", error);
      return false;
    }
  }, [walletAddress]);

  // Handle form submission with direct role setting
  const handleSubmit = useCallback(
    async (e) => {
      if (e) e.preventDefault();

      try {
        setLoading(true);
        setError(null);

        if (!formState.name.trim()) {
          throw new Error("Name is required");
        }

        if (!formState.role) {
          throw new Error("Please select a role");
        }

        if (!formState.agreeToTerms) {
          throw new Error("You must agree to the terms and conditions");
        }

        if (!formState.agreeToHipaa) {
          throw new Error("You must acknowledge the HIPAA consent");
        }

        const hipaaConsentRecorded = await createHipaaConsent();
        if (!hipaaConsentRecorded) {
          throw new Error("Failed to record HIPAA consent. Please try again.");
        }

        const userData = {
          ...formState,
          address: walletAddress,
          registrationDate: new Date().toISOString(),
        };

        const sanitizedData = hipaaComplianceService.sanitizeData(userData, {
          excludeFields: ["agreeToTerms", "agreeToHipaa"],
        });

        const registered = await register(sanitizedData);

        if (!registered) {
          throw new Error("Registration failed. Please try again.");
        }

        authService.completeRegistration(sanitizedData);

        dispatch(setRole(formState.role));
        dispatch(updateUserProfile(sanitizedData));

        await hipaaComplianceService.createAuditLog("USER_REGISTRATION", {
          userId: walletAddress,
          walletAddress,
          role: formState.role,
          timestamp: new Date().toISOString(),
        });

        localStorage.removeItem("healthmint_is_new_user");

        dispatch(
          addNotification({
            type: "success",
            message: "Registration completed successfully!",
            duration: 5000,
          })
        );

        if (onComplete) {
          onComplete(sanitizedData);
        }

        setRegistrationSuccessful(true);
      } catch (err) {
        console.error("Registration error:", err);
        setError(err.message || "Registration failed. Please try again.");

        dispatch(
          addNotification({
            type: "error",
            message: err.message || "Registration failed. Please try again.",
            duration: 5000,
          })
        );
      } finally {
        setLoading(false);
      }
    },
    [
      formState,
      walletAddress,
      createHipaaConsent,
      dispatch,
      onComplete,
      register,
    ]
  );

  const inputClass =
    "w-full px-3 py-2 rounded-token border border-line bg-surface text-fg placeholder-fg-subtle shadow-sm transition-colors focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:bg-surface-raised disabled:text-fg-muted disabled:cursor-not-allowed";

  const labelClass = "block text-sm font-medium text-fg mb-1";

  // Role card (shared for patient + researcher)
  const renderRoleCard = (roleKey, label, Icon, description) => {
    const isSelected = selectedRole === roleKey;
    return (
      <button
        type="button"
        onClick={() => handleRoleSelect(roleKey)}
        aria-pressed={isSelected}
        className={`text-left bg-surface rounded-token-lg border p-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-page ${
          isSelected
            ? "border-accent ring-2 ring-accent shadow-soft-md"
            : "border-line shadow-soft-sm hover:border-line-strong hover:shadow-soft-md"
        }`}
      >
        <div className="flex flex-col items-center text-center">
          <div className="bg-accent/10 text-accent p-4 rounded-full mb-4">
            <Icon size={32} aria-hidden="true" />
          </div>
          <h3 className="text-lg font-semibold text-fg mb-2">{label}</h3>
          <p className="text-fg-muted text-sm">{description}</p>
        </div>
      </button>
    );
  };

  // Step 1: Role Selection
  const renderRoleSelection = () => (
    <div className="mb-8">
      <h2
        ref={stepHeadingRef}
        tabIndex="-1"
        className="text-xl font-semibold text-fg mb-6 focus:outline-none"
      >
        Choose Your Role
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderRoleCard(
          "patient",
          "Patient",
          User,
          "Share and manage your health data securely. Control who can access your medical information."
        )}
        {renderRoleCard(
          "researcher",
          "Researcher",
          Briefcase,
          "Access anonymized health data for research with proper consent and HIPAA compliance."
        )}
      </div>

      <div className="mt-8 flex justify-end">
        <Button
          variant="primary"
          size="large"
          onClick={nextStep}
          disabled={!selectedRole || loading}
        >
          Next Step <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  );

  // Step 2: Personal Information
  const renderPersonalInfo = () => (
    <div className="mb-8">
      <h2
        ref={stepHeadingRef}
        tabIndex="-1"
        className="text-xl font-semibold text-fg mb-6 focus:outline-none"
      >
        Personal Information
      </h2>

      <div className="space-y-5">
        <div>
          <label htmlFor="name" className={labelClass}>
            Full Name <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formState.name}
            onChange={handleInputChange}
            className={inputClass}
            required
          />
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formState.email}
            onChange={handleInputChange}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-fg-subtle">
            Optional but recommended for notifications
          </p>
        </div>

        <div>
          <label htmlFor="age" className={labelClass}>
            Age
          </label>
          <input
            type="number"
            id="age"
            name="age"
            value={formState.age}
            onChange={handleInputChange}
            min="0"
            max="120"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="address" className={labelClass}>
            Wallet Address
          </label>
          <input
            type="text"
            id="address"
            name="address"
            value={walletAddress || ""}
            disabled
            className={`${inputClass} font-mono text-sm`}
          />
          <p className="mt-1 text-xs text-fg-subtle">
            Connected wallet address (non-editable)
          </p>
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <Button variant="ghost" size="large" onClick={prevStep}>
          <ArrowLeft size={18} /> Back
        </Button>
        <Button
          variant="primary"
          size="large"
          onClick={nextStep}
          disabled={!formState.name || loading}
        >
          Next Step <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  );

  // Step 3: HIPAA Consent
  const renderHipaaConsent = () => (
    <div className="mb-8">
      <h2
        ref={stepHeadingRef}
        tabIndex="-1"
        className="text-xl font-semibold text-fg mb-6 focus:outline-none"
      >
        HIPAA Consent
      </h2>

      <div className="bg-info-soft border border-info/30 rounded-token p-5 mb-6">
        <div className="flex items-start gap-2 mb-3">
          <AlertCircle
            size={18}
            className="text-info flex-shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <h3 className="text-base font-semibold text-info">
            Important: HIPAA Privacy Notice
          </h3>
        </div>

        <div className="text-info text-sm space-y-3">
          <p>
            HealthMint is committed to protecting your health information in
            accordance with the Health Insurance Portability and Accountability
            Act (HIPAA). By using our platform, you understand that:
          </p>

          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              Your health information will be stored securely on the blockchain
            </li>
            <li>You control who has access to your health data</li>
            <li>All data access is logged and auditable</li>
            <li>
              Your data may be used in anonymized form for research with your
              consent
            </li>
            <li>You can revoke access to your data at any time</li>
          </ul>

          <p>
            For more details, please review our complete{" "}
            <a href="/privacy" className="underline font-medium">
              Privacy Policy
            </a>{" "}
            and{" "}
            <a href="/terms" className="underline font-medium">
              Terms of Service
            </a>
            .
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <label className="flex items-start cursor-pointer gap-2">
          <input
            type="checkbox"
            name="agreeToTerms"
            checked={formState.agreeToTerms}
            onChange={handleInputChange}
            className="mt-1 rounded border-line text-accent focus:ring-accent focus:ring-offset-0"
          />
          <span className="text-sm text-fg-muted">
            I agree to the HealthMint{" "}
            <a href="/terms" className="text-accent underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-accent underline">
              Privacy Policy
            </a>
            .
          </span>
        </label>

        <label className="flex items-start cursor-pointer gap-2">
          <input
            type="checkbox"
            name="agreeToHipaa"
            checked={formState.agreeToHipaa}
            onChange={handleInputChange}
            className="mt-1 rounded border-line text-accent focus:ring-accent focus:ring-offset-0"
          />
          <span className="text-sm text-fg-muted">
            I acknowledge that I have read and understand the HIPAA Privacy
            Notice, and I consent to the collection and use of my health data
            as described.
          </span>
        </label>
      </div>

      <div className="mt-8 flex justify-between">
        <Button variant="ghost" size="large" onClick={prevStep}>
          <ArrowLeft size={18} /> Back
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="large"
          onClick={handleSubmit}
          disabled={!formState.agreeToTerms || !formState.agreeToHipaa}
          loading={loading}
        >
          {loading ? (
            "Completing Registration..."
          ) : (
            <>
              Complete Registration <Save size={18} />
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 1:
        return renderRoleSelection();
      case 2:
        return renderPersonalInfo();
      case 3:
        return renderHipaaConsent();
      default:
        return renderRoleSelection();
    }
  };

  // Success state
  if (registrationSuccessful) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page p-6">
        <div className="max-w-md w-full bg-surface border border-line shadow-soft-md rounded-token-lg p-8 text-center">
          <div
            className="bg-success-soft text-success p-4 rounded-full inline-flex mb-4"
            aria-hidden="true"
          >
            <CheckCircle size={40} />
          </div>
          <h2 className="text-xl font-bold text-fg mb-3">
            Registration Complete!
          </h2>
          <p className="text-fg-muted mb-6 text-sm">
            You have successfully registered as a{" "}
            {formState.role === "patient" ? "Patient" : "Researcher"}.
            Redirecting you to the dashboard...
          </p>
          <div className="flex justify-center gap-1" aria-hidden="true">
            <div className="w-8 h-1 rounded-full bg-accent animate-pulse" />
            <div className="w-8 h-1 rounded-full bg-accent animate-pulse [animation-delay:150ms]" />
            <div className="w-8 h-1 rounded-full bg-accent animate-pulse [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-page p-6">
      <div className="max-w-3xl w-full">
        <div className="bg-surface border border-line rounded-token-lg shadow-soft-md p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-fg mb-2">
              Complete Your Registration
            </h1>
            <p className="text-fg-muted text-sm">
              Set up your account to start using Healthmint
            </p>
            {walletAddress && (
              <div className="mt-3 flex justify-center">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-surface-raised border border-line">
                  <HashDisplay
                    value={walletAddress}
                    className="text-fg-muted text-xs"
                  />
                </span>
              </div>
            )}
          </div>

          {/* Progress steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[1, 2, 3].map((stepNumber) => {
                const isCurrent = step === stepNumber;
                const isComplete = step > stepNumber;
                return (
                  <div
                    key={stepNumber}
                    className="flex flex-col items-center flex-1"
                  >
                    <div
                      className={`flex items-center justify-center w-9 h-9 rounded-full border-2 text-sm font-semibold transition-colors ${
                        isCurrent
                          ? "border-accent bg-accent text-accent-fg"
                          : isComplete
                            ? "border-success bg-success text-accent-fg"
                            : "border-line bg-surface text-fg-muted"
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle size={16} aria-hidden="true" />
                      ) : (
                        stepNumber
                      )}
                    </div>
                    <div
                      className={`text-xs mt-1.5 ${
                        isCurrent ? "text-fg font-medium" : "text-fg-muted"
                      }`}
                    >
                      {STEP_LABELS[stepNumber - 1]}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="relative h-px bg-line mt-2 mx-9">
              <div
                className="absolute top-0 left-0 h-px bg-accent transition-all duration-300"
                style={{ width: `${((step - 1) / 2) * 100}%` }}
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div
              role="alert"
              className="mb-6 bg-danger-soft border border-danger/30 text-danger px-4 py-3 rounded-token flex items-center gap-2 text-sm"
            >
              <AlertCircle size={18} className="flex-shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {/* Main form content */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (step === 3) {
                handleSubmit();
              } else {
                nextStep();
              }
            }}
          >
            {renderStep()}
          </form>
        </div>
      </div>
    </div>
  );
};

UserRegistration.propTypes = {
  walletAddress: PropTypes.string.isRequired,
  onComplete: PropTypes.func,
};

export default UserRegistration;
