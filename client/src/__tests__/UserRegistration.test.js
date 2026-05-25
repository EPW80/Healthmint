// src/__tests__/UserRegistration.test.js
//
// Item 8.1 — tests for UserRegistration step navigation, form validation,
// and HIPAA consent gating. Tests are scoped to the three things most likely
// to silently break: step flow, required-field guards, and consent gating.

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";

import UserRegistration from "../components/UserRegistration";
import roleReducer from "../redux/slices/roleSlice";
import userReducer from "../redux/slices/userSlice";
import authReducer from "../redux/slices/authSlice";
import notificationReducer from "../redux/slices/notificationSlice";

// ── mocks ────────────────────────────────────────────────────────────────────

jest.mock("../services/hipaaComplianceService", () => ({
  __esModule: true,
  default: {
    createAuditLog: jest.fn().mockResolvedValue(true),
    recordConsent: jest.fn().mockResolvedValue(true),
    sanitizeData: jest.fn((data) => data),
    CONSENT_TYPES: { DATA_SHARING: "DATA_SHARING" },
    sanitizeInputValue: jest.fn((v) => v),
  },
}));

jest.mock("../services/authService", () => ({
  __esModule: true,
  default: {
    completeRegistration: jest.fn(),
    isAuthenticated: jest.fn().mockReturnValue(false),
  },
}));

// Mocked as an auto-mock; implementation is set in beforeEach so it survives
// jest.clearAllMocks() which clears mock.calls but NOT default implementations
// set via jest.fn(impl). However, the safest pattern is to set it explicitly
// each time with mockReturnValue so tests can override it predictably.
jest.mock("../hooks/useAuth");

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => jest.fn(),
}));

// ── helpers ──────────────────────────────────────────────────────────────────

const makeStore = () =>
  configureStore({
    reducer: {
      role: roleReducer,
      user: userReducer,
      auth: authReducer,
      notifications: notificationReducer,
    },
    preloadedState: {
      notifications: { notifications: [], maxNotifications: 5 },
      auth: {
        isAuthenticated: false,
        token: null,
        refreshToken: null,
        tokenExpiry: null,
        authLoading: false,
        authError: null,
        sessionActive: false,
        lastAuthActivity: null,
        userRoles: [],
      },
    },
  });

const WALLET = "0xabc123def456abc123def456abc123def456abc1";

const renderRegistration = (props = {}) => {
  const store = makeStore();
  const onComplete = jest.fn();
  const utils = render(
    <Provider store={store}>
      <MemoryRouter>
        <UserRegistration
          walletAddress={WALLET}
          onComplete={onComplete}
          {...props}
        />
      </MemoryRouter>
    </Provider>
  );
  return { ...utils, store, onComplete };
};

// ── setup ─────────────────────────────────────────────────────────────────────

let mockRegister;

beforeEach(() => {
  // Re-apply useAuth implementation after each clearAllMocks cycle.
  mockRegister = jest.fn().mockResolvedValue(true);
  const useAuth = require("../hooks/useAuth").default;
  useAuth.mockReturnValue({ register: mockRegister, isAuthenticated: false });
});

// ── tests ────────────────────────────────────────────────────────────────────

describe("UserRegistration", () => {
  // ── Step 1: role selection ────────────────────────────────────────────────

  describe("Step 1 — role selection", () => {
    it("renders the role selection step on mount", () => {
      renderRegistration();
      expect(screen.getByText(/choose your role/i)).toBeInTheDocument();
      expect(screen.getByText(/^patient$/i)).toBeInTheDocument();
      expect(screen.getByText(/^researcher$/i)).toBeInTheDocument();
    });

    it("Next Step button is disabled until a role is selected", () => {
      renderRegistration();
      const nextBtn = screen.getByRole("button", { name: /next step/i });
      expect(nextBtn).toBeDisabled();
    });

    it("Next Step button enables after selecting a role", () => {
      renderRegistration();
      // Click the Patient card (the h3 text is the most direct selector)
      fireEvent.click(screen.getByText(/^patient$/i).closest("div"));
      expect(screen.getByRole("button", { name: /next step/i })).not.toBeDisabled();
    });

    it("advances to step 2 when Next Step is clicked after role selection", () => {
      renderRegistration();
      fireEvent.click(screen.getByText(/^patient$/i).closest("div"));
      fireEvent.click(screen.getByRole("button", { name: /next step/i }));
      expect(screen.getByText(/personal information/i)).toBeInTheDocument();
    });
  });

  // ── Step 2: personal information ─────────────────────────────────────────

  describe("Step 2 — personal information", () => {
    const goToStep2 = () => {
      renderRegistration();
      fireEvent.click(screen.getByText(/^patient$/i).closest("div"));
      fireEvent.click(screen.getByRole("button", { name: /next step/i }));
    };

    it("renders the personal info form", () => {
      goToStep2();
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });

    it("wallet address field is pre-filled and disabled", () => {
      goToStep2();
      expect(screen.getByDisplayValue(WALLET)).toBeDisabled();
    });

    it("Next Step button is disabled when name is empty", () => {
      goToStep2();
      expect(screen.getByRole("button", { name: /next step/i })).toBeDisabled();
    });

    it("Next Step button enables after entering a name", () => {
      goToStep2();
      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Alice" } });
      expect(screen.getByRole("button", { name: /next step/i })).not.toBeDisabled();
    });

    it("Back button returns to step 1", () => {
      goToStep2();
      fireEvent.click(screen.getByRole("button", { name: /back/i }));
      expect(screen.getByText(/choose your role/i)).toBeInTheDocument();
    });

    it("advances to step 3 after entering a name", () => {
      goToStep2();
      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Alice" } });
      fireEvent.click(screen.getByRole("button", { name: /next step/i }));
      expect(screen.getByText(/hipaa consent/i)).toBeInTheDocument();
    });
  });

  // ── Step 3: HIPAA consent ─────────────────────────────────────────────────

  describe("Step 3 — HIPAA consent", () => {
    const goToStep3 = () => {
      renderRegistration();
      fireEvent.click(screen.getByText(/^patient$/i).closest("div"));
      fireEvent.click(screen.getByRole("button", { name: /next step/i }));
      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Alice" } });
      fireEvent.click(screen.getByRole("button", { name: /next step/i }));
    };

    it("renders the HIPAA consent step", () => {
      goToStep3();
      expect(screen.getByText(/hipaa consent/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /complete registration/i })).toBeInTheDocument();
    });

    it("Complete Registration is disabled when neither consent is checked", () => {
      goToStep3();
      expect(screen.getByRole("button", { name: /complete registration/i })).toBeDisabled();
    });

    it("Complete Registration stays disabled when only Terms is checked", () => {
      goToStep3();
      fireEvent.click(screen.getAllByRole("checkbox")[0]); // Terms only
      expect(screen.getByRole("button", { name: /complete registration/i })).toBeDisabled();
    });

    it("Complete Registration stays disabled when only HIPAA is checked", () => {
      goToStep3();
      fireEvent.click(screen.getAllByRole("checkbox")[1]); // HIPAA only
      expect(screen.getByRole("button", { name: /complete registration/i })).toBeDisabled();
    });

    it("Complete Registration enables when both consents are checked", () => {
      goToStep3();
      const [terms, hipaa] = screen.getAllByRole("checkbox");
      fireEvent.click(terms);
      fireEvent.click(hipaa);
      expect(screen.getByRole("button", { name: /complete registration/i })).not.toBeDisabled();
    });

    it("shows success screen and calls onComplete after successful registration", async () => {
      const { onComplete } = renderRegistration();

      fireEvent.click(screen.getByText(/^patient$/i).closest("div"));
      fireEvent.click(screen.getByRole("button", { name: /next step/i }));
      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Alice" } });
      fireEvent.click(screen.getByRole("button", { name: /next step/i }));

      const [terms, hipaa] = screen.getAllByRole("checkbox");
      fireEvent.click(terms);
      fireEvent.click(hipaa);
      fireEvent.click(screen.getByRole("button", { name: /complete registration/i }));

      await waitFor(() => {
        expect(screen.getByText(/registration complete/i)).toBeInTheDocument();
      });
      expect(onComplete).toHaveBeenCalled();
    });

    it("shows an error message when registration fails", async () => {
      // Override register to return false for this test
      mockRegister.mockResolvedValueOnce(false);

      renderRegistration();

      fireEvent.click(screen.getByText(/^patient$/i).closest("div"));
      fireEvent.click(screen.getByRole("button", { name: /next step/i }));
      fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Alice" } });
      fireEvent.click(screen.getByRole("button", { name: /next step/i }));

      const [terms, hipaa] = screen.getAllByRole("checkbox");
      fireEvent.click(terms);
      fireEvent.click(hipaa);
      fireEvent.click(screen.getByRole("button", { name: /complete registration/i }));

      await waitFor(() => {
        expect(screen.getByText(/registration failed/i)).toBeInTheDocument();
      });
    });
  });
});
