// src/components/Navigation.js
import React, { useState, useCallback } from "react";
import PropTypes from "prop-types";
import { Link, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  Home,
  Search,
  Settings,
  LogOut,
  Clock,
  Menu as MenuIcon,
  User,
  X,
  ChevronDown,
  AlertTriangle,
  ShoppingCart,
  HeartPulse,
  HardDrive,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import useNavigation from "../hooks/useNavigation.js";
import { setTheme, selectTheme } from "../redux/slices/uiSlice.js";
import HashDisplay from "./ui/HashDisplay.js";

const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor };
const THEME_NEXT = { light: "dark", dark: "system", system: "light" };
const THEME_LABELS = {
  light: "Light mode",
  dark: "Dark mode",
  system: "System mode",
};

const NavLink = ({ to, icon: Icon, label, onClick, mobile = false }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  if (mobile) {
    return (
      <Link
        to={to}
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-token text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
          isActive
            ? "bg-accent/10 text-accent"
            : "text-fg-muted hover:bg-surface hover:text-fg"
        }`}
      >
        {Icon && <Icon size={18} aria-hidden="true" />}
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-token-sm text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
        isActive
          ? "bg-accent/10 text-accent"
          : "text-fg-muted hover:bg-surface hover:text-fg"
      }`}
    >
      {Icon && <Icon size={16} aria-hidden="true" />}
      <span>{label}</span>
    </Link>
  );
};

NavLink.propTypes = {
  to: PropTypes.string.isRequired,
  icon: PropTypes.elementType,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  mobile: PropTypes.bool,
};

const Navigation = ({ account, onLogout, network, onSwitchNetwork }) => {
  const { navigateTo } = useNavigation();
  const dispatch = useDispatch();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userRole = useSelector((state) => state.role.role);
  const theme = useSelector(selectTheme);
  const ThemeIcon = THEME_ICONS[theme] || Monitor;

  const cycleTheme = useCallback(() => {
    dispatch(setTheme(THEME_NEXT[theme] || "light"));
  }, [dispatch, theme]);

  const toggleMobileMenu = () => setMobileMenuOpen((v) => !v);
  const toggleUserMenu = () => setUserMenuOpen((v) => !v);

  const handleLogout = useCallback(() => {
    if (onLogout) onLogout();
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    navigateTo("/login");
  }, [onLogout, navigateTo]);

  const getNavigationItems = () => {
    const baseItems = [
      { to: "/", label: "Home", icon: Home },
      { to: "/transactions", label: "Transactions", icon: Clock },
      { to: "/profile", label: "Profile", icon: Settings },
    ];

    if (userRole === "patient") {
      baseItems.splice(
        1,
        0,
        { to: "/storage", label: "Health Storage", icon: HardDrive },
        { to: "/contribute", label: "Contribute Data", icon: HeartPulse }
      );
    } else if (userRole === "researcher") {
      baseItems.splice(
        1,
        0,
        { to: "/browse", label: "Browse Data", icon: Search },
        { to: "/marketplace", label: "Request Portal", icon: ShoppingCart }
      );
    }

    return baseItems;
  };

  const navigationItems = getNavigationItems();
  const showNetworkWarning = network?.isSupported === false;

  const handleSwitchNetwork = useCallback(() => {
    if (onSwitchNetwork) onSwitchNetwork();
  }, [onSwitchNetwork]);

  const iconBtnClass =
    "p-1.5 rounded-token-sm text-fg-muted hover:text-fg hover:bg-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring";

  return (
    <div className="relative">
      {/* Network Warning */}
      {showNetworkWarning && (
        <div className="bg-warning-soft border border-warning/30 text-warning px-4 py-3 flex items-center gap-3 mx-4 mt-2 rounded-token text-sm">
          <AlertTriangle size={18} className="flex-shrink-0" aria-hidden="true" />
          <span className="flex-1">
            Connected to {network?.name || "an unsupported network"}. Please
            switch to Sepolia Testnet.
          </span>
          <button
            onClick={handleSwitchNetwork}
            className="px-3 py-1 bg-warning/20 hover:bg-warning/30 text-warning rounded-token-sm text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            Switch
          </button>
        </div>
      )}

      {/* Main Navigation */}
      <nav
        className="sticky top-0 z-40 bg-surface-raised/[0.97] backdrop-blur-sm border-b border-line shadow-soft-sm"
        aria-label="Main navigation"
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14 gap-4">
            {/* Mobile hamburger */}
            <button
              className={`md:hidden ${iconBtnClass}`}
              onClick={toggleMobileMenu}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {mobileMenuOpen ? (
                <X size={22} aria-hidden="true" />
              ) : (
                <MenuIcon size={22} aria-hidden="true" />
              )}
            </button>

            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2 text-fg font-bold text-lg hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded-token-sm flex-shrink-0"
            >
              <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                <div className="w-2.5 h-2.5 bg-accent-fg rounded-full" />
              </div>
              Healthmint
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex md:items-center md:gap-0.5 flex-1">
              {navigationItems.map((item) => (
                <NavLink key={item.to} {...item} />
              ))}
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-1.5">
              {/* Theme toggle */}
              <button
                onClick={cycleTheme}
                aria-label={`${THEME_LABELS[theme]}. Switch to ${THEME_LABELS[THEME_NEXT[theme]]}`}
                className={iconBtnClass}
              >
                <ThemeIcon size={18} aria-hidden="true" />
              </button>

              {account && (
                <>
                  {/* Address pill — desktop */}
                  <div className="hidden sm:flex items-center px-3 py-1 rounded-full bg-surface border border-line">
                    <HashDisplay
                      value={account}
                      className="text-fg-muted text-xs"
                    />
                  </div>

                  {/* User menu */}
                  <div className="relative">
                    <button
                      onClick={toggleUserMenu}
                      className={`flex items-center gap-0.5 ${iconBtnClass}`}
                      aria-label="Account menu"
                      aria-expanded={userMenuOpen}
                      aria-haspopup="true"
                    >
                      <User size={20} aria-hidden="true" />
                      <ChevronDown
                        size={14}
                        aria-hidden="true"
                        className={`transition-transform duration-200 ${
                          userMenuOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {userMenuOpen && (
                      <div
                        className="absolute right-0 mt-2 w-52 bg-surface-raised border border-line shadow-soft-md rounded-token z-50 py-1"
                        role="menu"
                        aria-orientation="vertical"
                      >
                        <Link
                          to="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-fg-muted hover:bg-surface hover:text-fg transition-colors"
                          role="menuitem"
                        >
                          <Settings size={14} aria-hidden="true" />
                          Profile Settings
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left text-danger hover:bg-danger-soft transition-colors"
                          role="menuitem"
                        >
                          <LogOut size={14} aria-hidden="true" />
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 bg-fg/40 z-30 transition-opacity duration-300 md:hidden ${
          mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={toggleMobileMenu}
        aria-hidden="true"
      />

      {/* Mobile Drawer */}
      <div
        id="mobile-menu"
        className={`fixed inset-y-0 left-0 w-64 bg-surface-raised shadow-soft-lg transform transition-transform duration-300 ease-in-out z-40 md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-line">
          <Link
            to="/"
            className="flex items-center gap-2 text-fg font-bold text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded-token-sm"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-accent-fg rounded-full" />
            </div>
            Healthmint
          </Link>
          <button
            onClick={toggleMobileMenu}
            className={iconBtnClass}
            aria-label="Close menu"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="p-3">
          <nav aria-label="Mobile navigation">
            <div className="space-y-0.5">
              {navigationItems.map((item) => (
                <NavLink
                  key={item.to}
                  {...item}
                  mobile
                  onClick={() => setMobileMenuOpen(false)}
                />
              ))}
            </div>
          </nav>

          {account && (
            <div className="border-t border-line mt-4 pt-4 space-y-0.5">
              <div className="px-3 py-2">
                <HashDisplay value={account} className="text-fg-muted" />
              </div>

              <button
                onClick={cycleTheme}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-token text-sm text-fg-muted hover:bg-surface hover:text-fg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <ThemeIcon size={18} aria-hidden="true" />
                <span>{THEME_LABELS[theme]}</span>
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-token text-sm font-medium text-danger hover:bg-danger-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <LogOut size={18} aria-hidden="true" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

Navigation.propTypes = {
  account: PropTypes.string,
  onLogout: PropTypes.func,
  userName: PropTypes.string,
  role: PropTypes.string,
  network: PropTypes.object,
  onSwitchNetwork: PropTypes.func,
};

export default Navigation;
