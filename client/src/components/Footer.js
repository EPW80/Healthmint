import React from "react";
import PropTypes from "prop-types";
import {
  Box,
  Container,
  Typography,
  Link,
  IconButton,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { Github, Twitter } from "lucide-react";

const GlassFooter = styled("footer")(({ theme }) => ({
  background: "rgba(255, 255, 255, 0.7)",
  backdropFilter: "blur(10px)",
  borderTop: "1px solid rgba(255, 255, 255, 0.3)",
  position: "fixed",
  bottom: 0,
  width: "100%",
  padding: theme.spacing(2, 0),
  zIndex: 1000,
  boxShadow: "0 -30px 30px rgba(0, 0, 0, 0.05)",
}));

const SocialIcon = styled(IconButton)(({ theme }) => ({
  margin: theme.spacing(0, 1),
  transition: "transform 0.2s ease-in-out, background-color 0.2s ease-in-out",
  "&:hover": {
    transform: "translateY(-3px)",
    backgroundColor: "rgba(0, 0, 0, 0.04)",
  },
  "&:focus": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: "2px",
  },
}));

const FooterLink = styled(Link)(({ theme }) => ({
  color: theme.palette.text.secondary,
  textDecoration: "none",
  transition: "color 0.2s ease-in-out",
  "&:hover": {
    color: theme.palette.primary.main,
  },
  "&:focus": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: "2px",
  },
  [theme.breakpoints.down("sm")]: {
    fontSize: "0.875rem",
    margin: theme.spacing(0.5, 1),
  },
}));

const Footer = ({
  companyName = "Healthmint",
  githubUrl = "https://github.com/EPW80/Healthmint",
  twitterUrl = "https://twitter.com/healthmint",
  contactEmail = "erikpw009@gmail.com",
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const currentYear = new Date().getFullYear();

  const handleContactClick = (e) => {
    e.preventDefault();
    window.location.href = `mailto:${contactEmail}`;
  };

  return (
    <GlassFooter role="contentinfo" aria-label="Site footer">
      <Container maxWidth="lg">
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 2,
            [theme.breakpoints.down("sm")]: {
              flexDirection: "column",
              textAlign: "center",
            },
          }}
        >
          <Box>
            <Typography
              variant={isMobile ? "caption" : "body2"}
              color="text.secondary"
            >
              © {currentYear} {companyName}. All rights reserved.
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: { xs: 1, sm: 2 },
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <FooterLink
              href={`${githubUrl}/blob/main/LICENSE`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View Privacy Policy"
            >
              Privacy Policy
            </FooterLink>
            <FooterLink
              href={`${githubUrl}/blob/main/LICENSE`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View Terms of Service"
            >
              Terms of Service
            </FooterLink>
            <FooterLink
              href={`mailto:${contactEmail}`}
              onClick={handleContactClick}
              aria-label="Contact us via email"
            >
              Contact
            </FooterLink>
          </Box>

          <Box
            sx={{
              display: "flex",
              gap: 1,
              justifyContent: "center",
            }}
          >
            <SocialIcon
              color="primary"
              aria-label="Visit our GitHub repository"
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
            >
              <Github size={20} />
            </SocialIcon>
            <SocialIcon
              color="primary"
              aria-label="Follow us on Twitter"
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
            >
              <Twitter size={20} />
            </SocialIcon>
          </Box>
        </Box>
      </Container>
    </GlassFooter>
  );
};

Footer.propTypes = {
  companyName: PropTypes.string,
  githubUrl: PropTypes.string,
  twitterUrl: PropTypes.string,
  contactEmail: PropTypes.string,
};

export default Footer;
