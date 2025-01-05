import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
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
  FormControlLabel,
  Checkbox,
  CircularProgress,
} from "@mui/material";
import { styled } from "@mui/material/styles";

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

const steps = ["Connect Wallet", "Verify Account", "Complete Profile"];

const WalletConnect = ({ onConnect }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userDetails, setUserDetails] = useState({
    age: "",
    agreeToTerms: false,
    email: "",
  });

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError("Please install MetaMask to continue");
      return;
    }

    try {
      setLoading(true);
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const account = accounts[0];
      setAccount(account);
      setActiveStep(1); // Move to verification step after connecting
    } catch (err) {
      console.error("Error connecting wallet:", err);
      setError("Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = () => {
    if (!userDetails.age || parseInt(userDetails.age) < 18) {
      setError("You must be 18 or older to use this platform");
      return;
    }
    if (!userDetails.agreeToTerms) {
      setError("You must agree to the terms and conditions");
      return;
    }
    setError("");
    setActiveStep(2);
  };

  const handleRegistrationComplete = async () => {
    try {
      setLoading(true);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      // Here you would typically make an API call to save user details
      // For now, we'll just connect
      onConnect({
        account,
        provider,
        signer,
        userDetails,
      });
    } catch (err) {
      console.error("Error completing registration:", err);
      setError("Failed to complete registration");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        setAccount(accounts[0]);
        setActiveStep(0); // Reset to first step if account changes
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", setAccount);
      }
    };
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
          <Box sx={{ mt: 3 }}>
            <StyledTextField
              fullWidth
              label="Age"
              type="number"
              value={userDetails.age}
              onChange={(e) =>
                setUserDetails({ ...userDetails, age: e.target.value })
              }
              sx={{ mb: 3 }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={userDetails.agreeToTerms}
                  onChange={(e) =>
                    setUserDetails({
                      ...userDetails,
                      agreeToTerms: e.target.checked,
                    })
                  }
                />
              }
              label="I agree to the terms and conditions"
            />
            <ConnectButton
              fullWidth
              onClick={handleVerification}
              sx={{ mt: 3 }}
            >
              Continue
            </ConnectButton>
          </Box>
        );
      case 2:
        return (
          <Box sx={{ mt: 3 }}>
            <StyledTextField
              fullWidth
              label="Email (optional)"
              type="email"
              value={userDetails.email}
              onChange={(e) =>
                setUserDetails({ ...userDetails, email: e.target.value })
              }
              sx={{ mb: 3 }}
            />
            <ConnectButton fullWidth onClick={handleRegistrationComplete}>
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
