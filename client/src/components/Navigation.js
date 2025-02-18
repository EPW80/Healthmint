import React, { useState, useCallback } from "react";
import PropTypes from "prop-types";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Tooltip,
} from "@mui/material";
import {
  Home,
  Upload,
  Search,
  Settings,
  LogOut,
  Menu as MenuIcon,
  User,
} from "lucide-react";

const NavButton = ({ to, icon: Icon, label, onClick, mobile }) => {
  const location = useLocation();
  const theme = useTheme();
  const isActive = location.pathname === to;

  const content = (
    <>
      {Icon && <Icon size={20} style={{ marginRight: mobile ? 16 : 8 }} />}
      {label}
    </>
  );

  if (mobile) {
    return (
      <ListItem
        button
        component={Link}
        to={to}
        onClick={onClick}
        selected={isActive}
        sx={{
          "&.Mui-selected": {
            backgroundColor: theme.palette.primary.main, // ✅ Matched project theme
            color: "white",
            "&:hover": {
              backgroundColor: theme.palette.primary.dark,
            },
          },
        }}
      >
        <ListItemIcon sx={{ color: isActive ? "white" : "inherit" }}>
          <Icon size={20} />
        </ListItemIcon>
        <ListItemText primary={label} />
      </ListItem>
    );
  }

  return (
    <Tooltip title={label}>
      <Button
        component={Link}
        to={to}
        color="inherit"
        sx={{
          minWidth: "auto",
          px: 2,
          color: isActive ? theme.palette.primary.contrastText : "white", // ✅ Ensure visibility
          backgroundColor: isActive
            ? theme.palette.primary.main
            : "transparent",
          "&:hover": {
            backgroundColor: theme.palette.primary.dark, // ✅ Darker hover effect
          },
        }}
        onClick={onClick}
      >
        {content}
      </Button>
    </Tooltip>
  );
};

NavButton.propTypes = {
  to: PropTypes.string.isRequired,
  icon: PropTypes.elementType,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  mobile: PropTypes.bool,
};

const Navigation = ({ account, onLogout }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const isMenuOpen = Boolean(menuAnchorEl);

  const handleMobileMenuToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleLogout = useCallback(() => {
    handleMenuClose();
    onLogout?.();
    navigate("/login");
  }, [onLogout, navigate]);

  const navigationItems = [
    { to: "/", label: "Home", icon: Home },
    { to: "/upload", label: "Upload Data", icon: Upload },
    { to: "/browse", label: "Browse Data", icon: Search },
    { to: "/profile", label: "Profile Settings", icon: Settings },
  ];

  const renderMobileDrawer = (
    <Drawer
      variant="temporary"
      anchor="left"
      open={mobileOpen}
      onClose={handleMobileMenuToggle}
      ModalProps={{
        keepMounted: true, // Better open performance on mobile
      }}
      sx={{
        "& .MuiDrawer-paper": {
          width: 240,
          boxSizing: "border-box",
          backgroundColor: theme.palette.background.default,
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" component="div">
          Healthmint
        </Typography>
      </Box>
      <Divider />
      <List>
        {navigationItems.map((item) => (
          <NavButton
            key={item.to}
            {...item}
            mobile
            onClick={handleMobileMenuToggle}
          />
        ))}
      </List>
      {account && (
        <>
          <Divider />
          <List>
            <ListItem>
              <Chip
                label={`${account.slice(0, 6)}...${account.slice(-4)}`}
                color="secondary"
                sx={{ width: "100%" }}
              />
            </ListItem>
            <ListItem button onClick={handleLogout}>
              <ListItemIcon>
                <LogOut size={20} />
              </ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItem>
          </List>
        </>
      )}
    </Drawer>
  );

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar
        position="static"
        sx={{
          backdropFilter: "blur(10px)",
          backgroundColor: theme.palette.primary.main, // ✅ Changed AppBar color to match project
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleMobileMenuToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{
              flexGrow: 1,
              textDecoration: "none",
              color: "white", // ✅ Ensure title is visible
              fontWeight: "bold",
              "&:hover": {
                opacity: 0.8,
              },
            }}
          >
            Healthmint
          </Typography>

          {!isMobile && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {navigationItems.map((item) => (
                <NavButton key={item.to} {...item} />
              ))}
            </Box>
          )}

          {account && (
            <Box sx={{ display: "flex", alignItems: "center", ml: 2 }}>
              <Chip
                label={`${account.slice(0, 6)}...${account.slice(-4)}`}
                color="secondary"
                sx={{
                  color: "white",
                  backgroundColor: theme.palette.secondary.main,
                  "&:hover": {
                    backgroundColor: theme.palette.secondary.dark,
                  },
                }}
              />
              <Tooltip title="Account settings">
                <IconButton
                  size="large"
                  edge="end"
                  color="inherit"
                  aria-label="account menu"
                  aria-controls="menu-appbar"
                  aria-haspopup="true"
                  onClick={handleMenuOpen}
                  sx={{ ml: 1 }}
                >
                  <User />
                </IconButton>
              </Tooltip>
              <Menu
                id="menu-appbar"
                anchorEl={menuAnchorEl}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "right",
                }}
                keepMounted
                transformOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                open={isMenuOpen}
                onClose={handleMenuClose}
              >
                <MenuItem
                  component={Link}
                  to="/profile"
                  onClick={handleMenuClose}
                >
                  <ListItemIcon>
                    <Settings size={20} />
                  </ListItemIcon>
                  <ListItemText>Profile Settings</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogOut size={20} />
                  </ListItemIcon>
                  <ListItemText>Logout</ListItemText>
                </MenuItem>
              </Menu>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      {isMobile && renderMobileDrawer}
    </Box>
  );
};

Navigation.propTypes = {
  account: PropTypes.string,
  onLogout: PropTypes.func,
};

export default Navigation;
