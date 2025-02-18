import React from "react";
import PropTypes from "prop-types";
import {
  useTheme,
  useMediaQuery,
  Container,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
} from "@mui/material";
import { GlassContainer, ConnectButton } from "../components/StyledComponents";
import WalletConnectComponent from "../components/WalletConnectComponent";
import { WalletIcon, AlertCircle } from "../icons";

// Constants
const STEPS = ["Connect Wallet", "Registration", "Complete Profile"];

const WalletWrapper = ({ onConnect }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { connectWallet, error, loading, account } = WalletConnectComponent({
    onConnect,
  });

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
        <GlassContainer elevation={3}>
          <Typography
            variant={isMobile ? "h4" : "h3"}
            component="h1"
            align="center"
            gutterBottom
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
            activeStep={0}
            sx={{ mb: 4 }}
            alternativeLabel={!isMobile}
            orientation={isMobile ? "vertical" : "horizontal"}
          >
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert
              severity="error"
              sx={{ mb: 3 }}
              onClose={() => {}}
              icon={<AlertCircle />}
            >
              {error}
            </Alert>
          )}

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

WalletWrapper.propTypes = {
  onConnect: PropTypes.func,
};

export default WalletWrapper;
