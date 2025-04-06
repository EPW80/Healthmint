// client/src/components/auth/ForgotPassword.js
import React, { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Loader, ArrowLeft, Mail, AlertCircle } from "lucide-react";
import { addNotification } from "../../redux/slices/notificationSlice";

const ForgotPassword = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // Form state
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Basic validation
      if (!email) {
        throw new Error("Please enter your email address");
      }
      
      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error("Please enter a valid email address");
      }
      
      // Simulate API call for password reset
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mark as successful
      setResetEmailSent(true);
      
      // Success notification
      dispatch(
        addNotification({
          type: "success",
          message: "Password reset email sent successfully!",
        })
      );
      
    } catch (err) {
      console.error("Password reset error:", err);
      setError(err.message || "Failed to send reset email. Please try again.");
      
      dispatch(
        addNotification({
          type: "error",
          message: err.message || "Failed to send reset email. Please try again.",
        })
      );
    } finally {
      setLoading(false);
    }
  }, [dispatch, email]);
  
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
          <h1 className="text-3xl font-bold mb-2">Reset Your Password</h1>
          <p className="text-gray-600">
            Enter your email to receive password reset instructions
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-8">
          {resetEmailSent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail size={32} className="text-green-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Check your inbox</h2>
              <p className="text-gray-600 mb-6">
                We've sent a password reset link to <strong>{email}</strong>. 
                Please check your email and follow the instructions to reset your password.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Didn't receive the email? Check your spam folder or 
                <button 
                  className="text-blue-600 hover:text-blue-800 ml-1" 
                  onClick={() => setResetEmailSent(false)}
                >
                  try again
                </button>.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center text-blue-600 hover:text-blue-800"
              >
                <ArrowLeft size={16} className="mr-1" /> Return to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label 
                  htmlFor="email" 
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your email"
                  required
                  disabled={loading}
                />
              </div>
              
              <button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </button>
              
              <div className="mt-4 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800"
                >
                  <ArrowLeft size={16} className="mr-1" /> Return to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;