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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  const [activeStep, setActiveStep] = useState(0);
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userData, setUserData] = useState({
    name: "",
    age: "",
    email: "",
    role: "",
    agreeToTerms: false,
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
      setActiveStep(1);
    } catch (err) {
      console.error("Error connecting wallet:", err);
      setError("Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, checked } = e.target;
    setUserData((prev) => ({
      ...prev,
      [name]: name === "agreeToTerms" ? checked : value,
    }));
  };

  const validateRegistration = () => {
    if (!userData.name || !userData.age || !userData.role) {
      setError("Please fill in all required fields");
      return false;
    }
    if (parseInt(userData.age) < 18) {
      setError("You must be 18 or older to register");
      return false;
    }
    if (!userData.agreeToTerms) {
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

      onConnect({
        account,
        provider,
        signer,
        userData,
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
        setActiveStep(0);
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
          <Box sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 3 }}>
            <StyledTextField
              fullWidth
              label="Full Name"
              name="name"
              value={userData.name}
              onChange={handleInputChange}
              required
            />
            <StyledTextField
              fullWidth
              label="Age"
              name="age"
              type="number"
              value={userData.age}
              onChange={handleInputChange}
              required
            />
            <StyledFormControl fullWidth required>
              <InputLabel>Role</InputLabel>
              <Select
                name="role"
                value={userData.role}
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
                  checked={userData.agreeToTerms}
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
              value={userData.email}
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
