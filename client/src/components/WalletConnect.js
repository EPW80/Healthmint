import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { networkConfig, addSepoliaToMetaMask } from "../config/network";
import {
  Box,
  Button,
  Typography,
  Container,
  Paper,
  Stepper,
  Step,
  StepLabel,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  CircularProgress,
} from "@mui/material";
import { styled } from "@mui/material/styles";

// Redux imports with corrected paths
import {
  setWalletConnection,
  clearWalletConnection,
} from "../redux/slices/authSlice";

import {
  setUserData, // Changed from setformData
  clearUserData, // Changed from clearformData
} from "../redux/slices/userSlice";

import { addNotification } from "../redux/slices/uiSlice";

// Styled components
const GlassContainer = styled(Paper)(({ theme }) => ({
  background: "rgba(255, 255, 255, 0.7)",
  backdropFilter: "blur(10px)",
  borderRadius: "24px",
  padding: theme.spacing(6),
  width: "100%",
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
  background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
  boxShadow: "0 3px 5px 2px rgba(33, 203, 243, .3)",
  transition: "all 0.3s ease",
  "&:hover": {
    background: "linear-gradient(45deg, #1976D2 30%, #2196F3 90%)",
    transform: "scale(1.02)",
  },
  "&:disabled": {
    background: "#grey",
  },
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: "12px",
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.8)",
    },
  },
}));

const StyledFormControl = styled(FormControl)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: "12px",
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.8)",
    },
  },
}));

const steps = ["Connect Wallet", "Registration", "Complete Profile"];

const WalletConnect = ({ onConnect }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
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

  const handleDisconnect = () => {
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
    dispatch(clearUserData());
    dispatch(
      addNotification({
        type: "info",
        message: "Wallet disconnected",
      })
    );
    navigate("/login");
  };

  const handleNewUser = (account) => {
    setActiveStep(1);
    dispatch(
      addNotification({
        type: "info",
        message: "Please complete registration",
      })
    );
  };

  const handleExistingUser = (account, provider, signer, userData) => {
    dispatch(
      setUserData({
        address: account,
        ...userData,
      })
    );

    dispatch(
      setWalletConnection({
        isConnected: true,
        address: account,
        provider,
        signer,
        walletType: "metamask",
      })
    );

    if (typeof onConnect === "function") {
      onConnect({
        account,
        provider,
        signer,
        userData,
      });
    }

    navigate("/");
  };

  const setupWalletListeners = () => {
    const handleAccountChange = (accounts) => {
      if (accounts.length === 0) {
        handleDisconnect();
      } else {
        const newAccount = accounts[0];
        dispatch(setUserData({ address: newAccount }));
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

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener("accountsChanged", handleAccountChange);
        window.ethereum.removeListener("chainChanged", handleChainChange);
        window.ethereum.removeListener("disconnect", handleDisconnect);
      }
    };
  };

  const checkNetwork = async () => {
    if (!window.ethereum) return false;

    try {
      const chainId = await window.ethereum.request({ method: "eth_chainId" });

      if (chainId !== networkConfig.requiredNetwork.chainId) {
        dispatch(
          addNotification({
            type: "info",
            message: "Please switch to Sepolia network",
          })
        );

        const success = await addSepoliaToMetaMask();
        if (!success) {
          dispatch(
            addNotification({
              type: "error",
              message:
                "Failed to switch to Sepolia network. Please switch manually in MetaMask.",
            })
          );
          return false;
        }

        // Verify the switch was successful
        const newChainId = await window.ethereum.request({
          method: "eth_chainId",
        });
        if (newChainId !== networkConfig.requiredNetwork.chainId) {
          dispatch(
            addNotification({
              type: "error",
              message: "Network switch was not successful. Please try again.",
            })
          );
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error("Error checking network:", error);
      dispatch(
        addNotification({
          type: "error",
          message: "Error checking network: " + error.message,
        })
      );
      return false;
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      dispatch(
        addNotification({
          type: "error",
          message: "Please install MetaMask to continue",
        })
      );
      setError("Please install MetaMask to continue");
      return;
    }

    try {
      // Add network check here to use the function
      const isCorrectNetwork = await checkNetwork();
      if (!isCorrectNetwork) {
        return;
      }

      setLoading(true);
      setError("");

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const account = accounts[0];
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      setAccount(account);

      try {
        const response = await fetch(
          `${
            process.env.REACT_APP_API_URL || "http://localhost:5000"
          }/api/auth/wallet/connect`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              address: account,
            }),
          }
        );

        const data = await response.json();

        if (!data.success) {
          throw new Error(
            data.message || "Server error during wallet connection"
          );
        }

        const { user, isNewUser } = data.data;

        if (isNewUser) {
          handleNewUser(account);
        } else {
          handleExistingUser(account, provider, signer, user);
        }

        setupWalletListeners();

        dispatch(
          addNotification({
            type: "success",
            message: data.message || "Wallet connected successfully",
          })
        );
      } catch (serverError) {
        console.error("Server connection error:", serverError);
        dispatch(
          addNotification({
            type: "error",
            message:
              serverError.message || "Failed to verify wallet with server",
          })
        );
        setError(serverError.message || "Failed to verify wallet with server");
      }
    } catch (error) {
      console.error("Wallet connection error:", error);
      dispatch(
        addNotification({
          type: "error",
          message: error.message || "Failed to connect wallet",
        })
      );
      setError(error.message || "Failed to connect wallet. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "agreeToTerms" ? checked : value,
    }));
  };

  const validateRegistration = () => {
    if (!formData.name || !formData.age || !formData.role) {
      setError("Please fill in all required fields");
      return false;
    }
    if (parseInt(formData.age) < 18) {
      setError("You must be 18 or older to register");
      return false;
    }
    if (!formData.agreeToTerms) {
      setError("You must agree to the terms and conditions");
      return false;
    }
    return true;
  };

  const handleRegistration = () => {
    if (validateRegistration()) {
      setError("");
      setActiveStep(2);
    }
  };

  const handleComplete = async () => {
    try {
      setLoading(true);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      const response = await fetch(
        `${
          process.env.REACT_APP_API_URL || "http://localhost:5000"
        }/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            address: account,
            ...formData,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Registration failed");
      }

      const data = await response.json();

      dispatch(
        setUserData({
          address: account,
          ...data.user,
        })
      );

      dispatch(
        setWalletConnection({
          isConnected: true,
          address: account,
          provider,
          signer,
        })
      );

      if (typeof onConnect === "function") {
        onConnect({
          account,
          provider,
          signer,
          userData: data.user,
        });
      }

      dispatch(
        addNotification({
          type: "success",
          message: "Registration completed successfully",
        })
      );

      navigate("/");
    } catch (err) {
      console.error("Error completing registration:", err);
      setError("Failed to complete registration");
      dispatch(
        addNotification({
          type: "error",
          message: "Registration failed",
        })
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        setAccount(accounts[0]);
        setActiveStep(0);
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);

      return () => {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );
      };
    }
  }, []);

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <ConnectButton
            variant="contained"
            fullWidth
            onClick={connectWallet}
            disabled={loading}
          >
            {loading ? "Connecting..." : "Connect MetaMask"}
          </ConnectButton>
        );
      case 1:
        return (
          <Box sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 3 }}>
            <StyledTextField
              fullWidth
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
            <StyledTextField
              fullWidth
              label="Age"
              name="age"
              type="number"
              value={formData.age}
              onChange={handleInputChange}
              required
            />
            <StyledFormControl fullWidth required>
              <InputLabel>Role</InputLabel>
              <Select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                label="Role"
              >
                <MenuItem value="patient">Patient</MenuItem>
                <MenuItem value="provider">Healthcare Provider</MenuItem>
                <MenuItem value="researcher">Researcher</MenuItem>
              </Select>
            </StyledFormControl>
            <FormControlLabel
              control={
                <Checkbox
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={handleInputChange}
                />
              }
              label="I agree to the terms and conditions"
            />
            <ConnectButton
              fullWidth
              onClick={handleRegistration}
              disabled={loading}
            >
              Continue
            </ConnectButton>
          </Box>
        );
      case 2:
        return (
          <Box sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 3 }}>
            <StyledTextField
              fullWidth
              label="Email (optional)"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
            />
            <ConnectButton
              fullWidth
              onClick={handleComplete}
              disabled={loading}
            >
              Complete Registration
            </ConnectButton>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        padding: 3,
      }}
    >
      <Container maxWidth="sm">
        <GlassContainer>
          <Typography
            variant="h3"
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

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Typography
              color="error"
              align="center"
              sx={{
                mb: 3,
                p: 2,
                borderRadius: 2,
                backgroundColor: "rgba(211, 47, 47, 0.1)",
              }}
            >
              {error}
            </Typography>
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
              }}
            >
              <Typography
                align="center"
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

          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <CircularProgress />
            </Box>
          )}
        </GlassContainer>
      </Container>
    </Box>
  );
};
export default WalletConnect;
