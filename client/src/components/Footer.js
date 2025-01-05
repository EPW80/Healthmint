import React from "react";
import { Box, Container, Typography, Link, IconButton } from "@mui/material";
import { styled } from "@mui/material/styles";
import GitHubIcon from "@mui/icons-material/GitHub";
import CloseIcon from "@mui/icons-material/Close"; // Importing the X icon

const GlassFooter = styled(Box)(({ theme }) => ({
  background: "rgba(255, 255, 255, 0.7)",
  backdropFilter: "blur(10px)",
  borderTop: "1px solid rgba(255, 255, 255, 0.3)",
  position: "fixed",
  bottom: 0,
  width: "100%",
  padding: theme.spacing(2, 0),
  zIndex: 1000,
  boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.05)",
}));

const SocialIcon = styled(IconButton)(({ theme }) => ({
  margin: theme.spacing(0, 1),
  transition: "transform 0.2s ease-in-out",
  "&:hover": {
    transform: "translateY(-3px)",
  },
}));

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <GlassFooter>
      <Container maxWidth="lg">
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography variant="body2" color="text.secondary">
              © {currentYear} Healthmint. All rights reserved.
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Link href="#" color="text.secondary" sx={{ mx: 2 }}>
              Privacy Policy
            </Link>
            <Link href="#" color="text.secondary" sx={{ mx: 2 }}>
              Terms of Service
            </Link>
            <Link href="#" color="text.secondary" sx={{ mx: 2 }}>
              Contact
            </Link>
          </Box>

          <Box>
            <SocialIcon
              color="primary"
              aria-label="github"
              component="a"
              href="https://github.com/EPW80/Healthmint/tree/main"
            >
              <GitHubIcon />
            </SocialIcon>
            <SocialIcon
              color="primary"
              aria-label="close"
              component="a"
              href="#"
            >
              <CloseIcon />
            </SocialIcon>
          </Box>
        </Box>
      </Container>
    </GlassFooter>
  );
};

export default Footer;
