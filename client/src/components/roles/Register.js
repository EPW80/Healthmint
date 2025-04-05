// client/src/components/roles/Register.js
import React, { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Loader, ArrowLeft, AlertCircle, Users } from "lucide-react";
import { addNotification } from "../../redux/slices/notificationSlice";
import { updateUserProfile } from "../../redux/slices/userSlice";
import { setRole } from "../../redux/slices/roleSlice";
import authService from "/../services/authService";

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const validateForm = () => {
    if (!formData.name) {
      throw new Error("Please enter your name");
    }
    
    if (!formData.email) {
      throw new Error("Please enter your email");
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      throw new Error("Please enter a valid email address");
    }
    
    if (!formData.password) {
      throw new Error("Please enter a password");
    }
    
    // Password strength validation
    if (formData.password.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }
    
    if (formData.password !== formData.confirmPassword) {
      throw new Error("Passwords do not match");
    }
    
    if (!formData.agreeToTerms) {
      throw new Error("You must agree to the Terms of Service and Privacy Policy");
    }
    
    return true;
  };
  
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Validate form data
      validateForm();
      
      // Get wallet address if available
      const walletAddress = localStorage.getItem("healthmint_wallet_address") || "0x0000000";
      
      // Create user data
      const userData = {
        id: 'user-' + Math.random().toString(36).substring(2),
        name: formData.name,
        email: formData.email,
        role: "patient", // Default role
        address: walletAddress,
        createdAt: new Date().toISOString()
      };
      
      // Create a mock token
      const token = 'token-' + Date.now();
      
      // Set all required localStorage items for your auth system
      localStorage.setItem("healthmint_user", JSON.stringify(userData));
      localStorage.setItem("healthmint_auth_token", token);
      localStorage.setItem("healthmint_token_expiry", (Date.now() + 3600 * 1000).toString());
      localStorage.setItem("healthmint_registration_status", "complete");
      localStorage.setItem("healthmint_user_role", "patient");
      localStorage.setItem("healthmint_is_new_user", "false");
      localStorage.setItem("healthmint_wallet_connection", "true");
      
      // Mark registration as complete using your auth service
      authService.completeRegistration({
        ...userData,
        token
      });
      
      // Update Redux state
      dispatch(setRole("patient"));
      dispatch(updateUserProfile(userData));
      
      // Success notification
      dispatch(
        addNotification({
          type: "success",
          message: "Account created successfully! Welcome to Healthmint.",
          duration: 5000,
        })
      );
      
      // Navigate to dashboard
      navigate("/dashboard", {
        replace: true,
        state: { registrationCompleted: true }
      });
      
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.message || "Failed to create account. Please try again.");
      
      dispatch(
        addNotification({
          type: "error",
          message: err.message || "Failed to create account. Please try again.",
        })
      );
    } finally {
      setLoading(false);
    }
  }, [dispatch, navigate, formData]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      {error && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-md flex items-center gap-2">
          <AlertCircle size={20} className="flex-shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="max-w-md w-full">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Create an Account</h1>
          <p className="text-gray-600">
            Join Healthmint to securely manage and share your health data
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-8">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label 
                htmlFor="name" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your full name"
                required
                disabled={loading}
              />
            </div>
            
            <div className="mb-4">
              <label 
                htmlFor="email" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email"
                required
                disabled={loading}
              />
            </div>
            
            <div className="mb-4">
              <label 
                htmlFor="password" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Create a password"
                required
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500">
                Password must be at least 8 characters long
              </p>
            </div>
            
            <div className="mb-6">
              <label 
                htmlFor="confirmPassword" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Confirm your password"
                required
                disabled={loading}
              />
            </div>
            
            <div className="mb-6">
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={loading}
                />
                <span className="ml-2 block text-sm text-gray-700">
                  I agree to the 
                  <a href="/terms" className="text-blue-600 hover:text-blue-800 mx-1">
                    Terms of Service
                  </a> 
                  and 
                  <a href="/privacy" className="text-blue-600 hover:text-blue-800 mx-1">
                    Privacy Policy
                  </a>
                </span>
              </label>
            </div>
            
            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <Users size={16} className="mr-2" />
                  Create Account
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account? 
            <Link to="/login" className="text-blue-600 hover:text-blue-800 ml-1">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;