import { styled } from "@mui/material/styles";
import { Paper, Button, TextField, FormControl } from "@mui/material";

// Glass effect container
export const GlassContainer = styled(Paper)(({ theme }) => ({
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

// Styled Connect Button
export const ConnectButton = styled(Button)(({ theme }) => ({
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

// Styled Text Field
export const StyledTextField = styled(TextField)(({ theme }) => ({
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

// Styled Form Control
export const StyledFormControl = styled(FormControl)(({ theme }) => ({
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
