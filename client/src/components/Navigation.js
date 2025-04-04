// src/components/Navigation.js
import React, { useState, useCallback } from "react";
import PropTypes from "prop-types";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Upload,
  Search,
  Settings,
  LogOut,
  Clock,
  Menu as MenuIcon,
  User,
  X,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import useNavigation from "../hooks/useNavigation.js";

// Navigation link component
const NavLink = ({ to, icon: Icon, label, onClick, mobile = false }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  if (mobile) {
    return (
      <Link
        to={to}
        onClick={onClick}
        className={`flex items-center p-3 rounded-lg transition-colors ${
          isActive
            ? "bg-blue-500 text-white"
            : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        {Icon && <Icon size={20} className="mr-3" />}
        <span className="font-medium">{label}</span>
      </Link>
    );
  }

  return (
    <div className="relative group">
      <Link
        to={to}
        className={`flex items-center px-3 py-2 rounded-lg font-medium transition-colors ${
          isActive ? "bg-white/20 text-white" : "text-white hover:bg-white/10"
        }`}
        onClick={onClick}
      >
        {Icon && <Icon size={18} className="mr-2" />}
        <span>{label}</span>
      </Link>
      {/* Active indicator dot for desktop */}
      {isActive && (
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full hidden md:block"></div>
      )}
    </div>
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
  };

  const handleLogout = useCallback(() => {
    if (onLogout) {
      onLogout();
    }
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    navigateTo("/login");
  }, [onLogout, navigateTo]);

  const navigationItems = [
    { to: "/", label: "Home", icon: Home },
    { to: "/upload", label: "Upload Data", icon: Upload },
    { to: "/browse", label: "Browse Data", icon: Search },
    { to: "/transactions", label: "Transactions", icon: Clock },
    { to: "/profile", label: "Profile Settings", icon: Settings },
  ];

  const showNetworkWarning = network && network.isSupported === false;

  const handleSwitchNetwork = useCallback(() => {
    if (onSwitchNetwork) {
      onSwitchNetwork();
    }
  }, [onSwitchNetwork]);

  return (
    <div className="relative">
      {/* Network Warning */}
      {showNetworkWarning && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg flex items-center gap-2 mx-4 mt-2">
          <AlertTriangle size={20} className="text-yellow-500 flex-shrink-0" />
          <span className="flex-1">
            You're connected to {network?.name || "an unsupported network"}.
            Please switch to Sepolia Testnet.
          </span>
          <button
            onClick={handleSwitchNetwork}
            className="ml-2 px-3 py-1 bg-yellow-200 text-yellow-800 rounded-lg text-sm font-medium hover:bg-yellow-300 transition-colors"
          >
            Switch
          </button>
        </div>
      )}
      {/* Main Navigation */}
      <nav className="bg-blue-600 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Mobile menu button */}
            <button
              className="text-white md:hidden focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 rounded-lg p-1"
              onClick={toggleMobileMenu}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <MenuIcon size={24} />}
            </button>

            {/* Logo */}
            <Link
              to="/"
              className="text-white text-xl font-bold hover:opacity-80 transition-opacity flex items-center gap-2"
            >
              <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center">
                <div className="w-5 h-5 bg-blue-600 rounded-full"></div>
              </div>
              Healthmint
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex md:items-center md:gap-1">
              {navigationItems.map((item) => (
                <NavLink key={item.to} {...item} />
              ))}
            </div>

            {/* User Account */}
            {account && (
              <div className="flex items-center">
                <div className="bg-blue-700 text-white text-sm font-medium px-3 py-1 rounded-full">
                  {`${account.slice(0, 6)}...${account.slice(-4)}`}
                </div>
                <div className="relative ml-3">
                  <button
                    onClick={toggleUserMenu}
                    className="text-white p-1 rounded-full hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 flex items-center"
                    aria-expanded={userMenuOpen}
                    aria-haspopup="true"
                  >
                    <User size={22} />
                    <ChevronDown
                      size={16}
                      className={`ml-1 transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* User dropdown menu */}
                  {userMenuOpen && (
                    <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                      <div
                        className="py-1"
                        role="menu"
                        aria-orientation="vertical"
                      >
                        <Link
                          to="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                          role="menuitem"
                        >
                          <Settings size={16} className="mr-2 text-gray-500" />
                          Profile Settings
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                          role="menuitem"
                        >
                          <LogOut size={16} className="mr-2 text-gray-500" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity duration-300 md:hidden ${
          mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={toggleMobileMenu}
        aria-hidden="true"
      />

      {/* Mobile Menu Drawer */}
      <div
        id="mobile-menu"
        className={`fixed inset-y-0 left-0 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-40 md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <Link
            to="/"
            className="text-xl font-bold text-blue-600 flex items-center gap-2"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center">
              <div className="w-5 h-5 bg-white rounded-full"></div>
            </div>
            Healthmint
          </Link>
          <button
            onClick={toggleMobileMenu}
            className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <NavLink
                key={item.to}
                {...item}
                mobile
                onClick={() => setMobileMenuOpen(false)}
              />
            ))}
          </div>

          {account && (
            <>
              <div className="border-t border-gray-200 my-4 pt-4">
                <div className="bg-blue-50 text-blue-700 font-medium px-4 py-2 rounded-lg mb-4 flex items-center justify-center">
                  <User size={16} className="mr-2" />
                  {`${account.slice(0, 6)}...${account.slice(-4)}`}
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full p-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <LogOut size={20} className="mr-3 text-red-500" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </>
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
