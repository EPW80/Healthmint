import React, { useState, useEffect, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { networkConfig } from "../config/network";
import {
  Box,
  Container,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  Wallet as WalletIcon,
  User as UserIcon,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

// Redux actions
import {
  updateWalletConnection,
  clearWalletConnection,
} from "../redux/slices/authSlice";

import { updateUserProfile, clearUserProfile } from "../redux/slices/userSlice";

import { addNotification } from "../redux/slices/uiSlice";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

// Constants
const STEPS = ["Connect Wallet", "Registration", "Complete Profile"];
const MIN_AGE = 18;
const MAX_AGE = 120;

const ROLES = [
  { value: "patient", label: "Patient" },
  { value: "provider", label: "Healthcare Provider" },
  { value: "researcher", label: "Researcher" },
];

// Styled components
const GlassContainer = styled(Paper)(({ theme }) => ({
  background: "rgba(255, 255, 255, 0.8)",
  backdropFilter: "blur(10px)",
  borderRadius: "24px",
  padding: theme.spacing(6),
  width: "100%",
  maxWidth: "500px",
  margin: "0 auto",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
  border: "1px solid rgba(255, 255, 255, 0.3)",
  transition: "transform 0.3s ease, box-shadow 0.3s ease",
  "&:hover": {
    transform: "translateY(-5px)",
    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.15)",
  },
}));

const ConnectButton = styled(Button)(({ theme }) => ({
  borderRadius: "12px",
  padding: "16px",
  fontSize: "1.1rem",
  fontWeight: "bold",
  background: theme.palette.primary.gradient,
  boxShadow: "0 3px 5px 2px rgba(33, 203, 243, .3)",
  transition: "all 0.3s ease",
  "&:hover": {
    background: theme.palette.primary.gradientDark,
    transform: "scale(1.02)",
  },
  "&:disabled": {
    background: theme.palette.action.disabledBackground,
  },
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: "12px",
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.8)",
    },
    "&.Mui-focused": {
      backgroundColor: "rgba(255, 255, 255, 0.9)",
    },
  },
}));

const StyledFormControl = styled(FormControl)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: "12px",
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.8)",
    },
    "&.Mui-focused": {
      backgroundColor: "rgba(255, 255, 255, 0.9)",
    },
  },
}));

const WalletConnect = ({ onConnect }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const cleanupRef = useRef();

  // State
  const [activeStep, setActiveStep] = useState(0);
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    email: "",
    role: "",
    agreeToTerms: false,
  });

  const handleExistingUser = useCallback(
    (account, provider, signer, userData) => {
      dispatch(updateUserProfile({ address: account, ...userData }));
      dispatch(
        updateWalletConnection({
          isConnected: true,
          address: account,
          provider,
          signer,
          walletType: "metamask",
        })
      );
      onConnect?.({ account, provider, signer, userData });
      navigate("/");
    },
    [dispatch, navigate, onConnect]
  );

  // Core wallet functions
  const handleDisconnect = useCallback(() => {
    setAccount("");
    setActiveStep(0);
    setFormData({
      name: "",
      age: "",
      email: "",
      role: "",
      agreeToTerms: false,
    });
    dispatch(clearWalletConnection());
    dispatch(clearUserProfile());
    dispatch(
      addNotification({
        type: "info",
        message: "Wallet disconnected",
      })
    );
    navigate("/login");
  }, [dispatch, navigate]);

  // Handle wallet events
  const setupWalletListeners = useCallback(() => {
    if (!window.ethereum?.removeListener) return;

    const handleAccountChange = (accounts) => {
      if (accounts.length === 0) {
        handleDisconnect();
      } else {
        const newAccount = accounts[0];
        dispatch(updateUserProfile({ address: newAccount }));
        dispatch(
          addNotification({
            type: "info",
            message: "Account changed",
          })
        );
      }
    };

    const handleChainChange = () => {
      dispatch(
        addNotification({
          type: "warning",
          message: "Network changed. Please reconnect your wallet.",
        })
      );
      handleDisconnect();
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountChange);
    window.ethereum.on("chainChanged", handleChainChange);
    window.ethereum.on("disconnect", handleDisconnect);

    cleanupRef.current = () => {
      window.ethereum.removeListener("accountsChanged", handleAccountChange);
      window.ethereum.removeListener("chainChanged", handleChainChange);
      window.ethereum.removeListener("disconnect", handleDisconnect);
    };
  }, [dispatch, handleDisconnect]);

  // Update callApi function to properly format requests
  const callApi = async (endpoint, method = "GET", data = null) => {
    try {
      const options = {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || "API call failed");
      }

      return responseData;
    } catch (error) {
      console.error("API Call Error:", error);
      throw error;
    }
  };

  // Connect wallet
  const connectWallet = useCallback(async () => {
    // Check for MetaMask installation
    if (!window.ethereum) {
      const error = "Please install MetaMask to continue";
      setError(error);
      dispatch(addNotification({ type: "error", message: error }));
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Network validation
      const validateNetwork = async () => {
        const chainId = await window.ethereum.request({
          method: "eth_chainId",
        });
        if (!chainId) {
          throw new Error("Could not detect network");
        }

        // Ensure chainId is in hex format
        const currentChainId =
          typeof chainId === "number" ? `0x${chainId.toString(16)}` : chainId;

        if (currentChainId !== networkConfig.requiredNetwork.chainId) {
          dispatch(
            addNotification({
              type: "info",
              message: "Switching to Sepolia network...",
            })
          );

          try {
            // Try switching to Sepolia
            await window.ethereum.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: networkConfig.requiredNetwork.chainId }],
            });
          } catch (switchError) {
            // Handle network addition if needed
            if (switchError.code === 4902 || switchError.code === -32603) {
              await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: networkConfig.requiredNetwork.chainId,
                    chainName: "Sepolia",
                    nativeCurrency: {
                      name: "ETH",
                      symbol: "ETH",
                      decimals: 18,
                    },
                    rpcUrls: [
                      process.env.REACT_APP_INFURA_PROJECT_ID
                        ? `https://sepolia.infura.io/v3/${process.env.REACT_APP_INFURA_PROJECT_ID}`
                        : "https://rpc.sepolia.org",
                      "https://rpc.sepolia.org",
                    ].filter(Boolean),
                    blockExplorerUrls: ["https://sepolia.etherscan.io"],
                  },
                ],
              });
            } else {
              throw new Error(
                switchError.code === 4001
                  ? "Please switch to Sepolia network to continue"
                  : "Failed to switch network"
              );
            }
          }
        }
      };

      // Validate and switch network if needed
      await validateNetwork();

      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (!accounts?.length) {
        throw new Error("Please connect your wallet to continue");
      }

      const account = accounts[0];
      setAccount(account);

      // Initialize provider
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      // Get current network details
      const network = await provider.getNetwork();

      // Verify network after connection
      const requiredChainId = parseInt(
        networkConfig.requiredNetwork.chainId,
        16
      );
      if (network.chainId !== requiredChainId) {
        throw new Error("Please switch to Sepolia network");
      }

      // Prepare API request
      const payload = {
        address: account,
        chainId: network.chainId,
        timestamp: new Date().toISOString(),
      };

      // Connect wallet on backend
      const response = await callApi(
        "/api/auth/wallet/connect",
        "POST",
        payload
      );

      if (!response?.success) {
        throw new Error(response?.message || "Failed to connect wallet");
      }

      if (response.data?.isNewUser) {
        setActiveStep(1);
        dispatch(
          addNotification({
            type: "info",
            message: "Please complete registration",
          })
        );
      } else {
        await handleExistingUser(
          account,
          provider,
          signer,
          response.data?.user
        );
      }

      // Setup wallet event listeners
      setupWalletListeners();
    } catch (error) {
      console.error("Wallet connection error:", {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });

      const errorMessage =
        error.code === 4001
          ? "User rejected wallet connection"
          : error.message || "Failed to connect wallet";

      setError(errorMessage);
      dispatch(
        addNotification({
          type: "error",
          message: errorMessage,
        })
      );
    } finally {
      setLoading(false);
    }
  }, [dispatch, handleExistingUser, setupWalletListeners]); // Removed networkConfig from dependencies

  // Complete registration
  const handleComplete = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      const response = await callApi("/api/auth/register", "POST", {
        address: account,
        ...formData,
      });

      await handleExistingUser(account, provider, signer, response.user);

      dispatch(
        addNotification({
          type: "success",
          message: "Registration completed successfully",
        })
      );
    } catch (error) {
      console.error("Error completing registration:", error);
      setError(error.message || "Failed to complete registration");
    } finally {
      setLoading(false);
    }
  }, [account, formData, dispatch, handleExistingUser]);

  // Form validation
  const validateForm = useCallback(() => {
    if (!formData.name?.trim() || !formData.age || !formData.role) {
      throw new Error("Please fill in all required fields");
    }

    const age = parseInt(formData.age);
    if (isNaN(age) || age < MIN_AGE || age > MAX_AGE) {
      throw new Error(`Age must be between ${MIN_AGE} and ${MAX_AGE}`);
    }

    if (!formData.agreeToTerms) {
      throw new Error("You must agree to the terms and conditions");
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      throw new Error("Please enter a valid email address");
    }

    return true;
  }, [formData]);

  // Handle registration
  const handleRegistration = useCallback(() => {
    try {
      validateForm();
      setError("");
      setActiveStep(2);
    } catch (error) {
      setError(error.message);
    }
  }, [validateForm]);

  // Handle input changes
  const handleInputChange = useCallback((e) => {
    const { name, value, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "agreeToTerms" ? checked : value,
    }));
  }, []);

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  // Render step content
  const renderStepContent = useCallback(
    (step) => {
      switch (step) {
        case 0:
          return (
            <ConnectButton
              variant="contained"
              fullWidth
              onClick={connectWallet}
              disabled={loading}
              startIcon={!loading && <WalletIcon />}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Connect MetaMask"
              )}
            </ConnectButton>
          );

        case 1:
          return (
            <Box
              sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 3 }}
            >
              <StyledTextField
                fullWidth
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                disabled={loading}
              />
              <StyledTextField
                fullWidth
                label="Age"
                name="age"
                type="number"
                value={formData.age}
                onChange={handleInputChange}
                required
                disabled={loading}
                inputProps={{
                  min: MIN_AGE,
                  max: MAX_AGE,
                }}
                helperText={`Age must be between ${MIN_AGE} and ${MAX_AGE}`}
              />
              <StyledFormControl fullWidth required disabled={loading}>
                <InputLabel>Role</InputLabel>
                <Select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  label="Role"
                >
                  {ROLES.map((role) => (
                    <MenuItem key={role.value} value={role.value}>
                      {role.label}
                    </MenuItem>
                  ))}
                </Select>
              </StyledFormControl>
              <FormControlLabel
                control={
                  <Checkbox
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                }
                label="I agree to the terms and conditions"
              />
              <ConnectButton
                fullWidth
                onClick={handleRegistration}
                disabled={loading}
                startIcon={!loading && <UserIcon />}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "Continue"
                )}
              </ConnectButton>
            </Box>
          );

        case 2:
          return (
            <Box
              sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 3 }}
            >
              <StyledTextField
                fullWidth
                label="Email (optional)"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={loading}
                helperText="Optional - We'll use this to send important updates"
              />
              <ConnectButton
                fullWidth
                onClick={handleComplete}
                disabled={loading}
                startIcon={!loading && <CheckCircle />}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "Complete Registration"
                )}
              </ConnectButton>
            </Box>
          );

        default:
          return null;
      }
    },
    [
      formData,
      handleInputChange,
      handleRegistration,
      handleComplete,
      loading,
      connectWallet,
    ]
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        padding: 3,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Container maxWidth="sm">
        <GlassContainer elevation={3}>
          <Typography
            variant={isMobile ? "h4" : "h3"}
            component="h1"
            gutterBottom
            align="center"
            sx={{
              fontWeight: "bold",
              background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              mb: 3,
            }}
          >
            Welcome to Healthmint
          </Typography>

          <Stepper
            activeStep={activeStep}
            sx={{ mb: 4 }}
            alternativeLabel={!isMobile}
            orientation={isMobile ? "vertical" : "horizontal"}
          >
            {STEPS.map((label, index) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert
              severity="error"
              sx={{ mb: 3 }}
              onClose={() => setError("")}
              icon={<AlertCircle />}
            >
              {error}
            </Alert>
          )}

          {renderStepContent(activeStep)}

          {account && (
            <Box
              sx={{
                mt: 3,
                p: 2,
                borderRadius: 2,
                backgroundColor: "rgba(33, 150, 243, 0.1)",
                border: "1px solid rgba(33, 150, 243, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
              }}
            >
              <WalletIcon size={16} />
              <Typography
                sx={{
                  color: "primary.main",
                  fontWeight: 500,
                  fontSize: "0.9rem",
                }}
              >
                Connected: {account.slice(0, 6)}...{account.slice(-4)}
              </Typography>
            </Box>
          )}
        </GlassContainer>
      </Container>
    </Box>
  );
};

WalletConnect.propTypes = {
  onConnect: PropTypes.func,
};

export default WalletConnect;
