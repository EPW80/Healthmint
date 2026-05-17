// src/components/StyledComponents.js
import React from "react";
import PropTypes from "prop-types";

// GlassContainer: A flexible container with glassmorphism effect
export const GlassContainer = ({
  children,
  className = "",
  padding = "p-8 sm:p-10",
  maxWidth = "max-w-lg",
  ...props
}) => (
  <div
    className={`bg-white/80 backdrop-blur-md rounded-3xl ${padding} w-full ${maxWidth} mx-auto shadow-xl border border-white/30 transition-all duration-300 hover:translate-y-[-5px] hover:shadow-2xl focus-within:shadow-2xl ${className}`}
    {...props}
  >
    {children}
  </div>
);

GlassContainer.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  padding: PropTypes.string,
  maxWidth: PropTypes.string,
};

// PurchaseButton: A button with gradient background and a hover effect
export const ConnectButton = ({
  children,
  disabled = false,
  onClick,
  className = "",
  ...props
}) => (
  <button
    className={`w-full py-4 px-6 text-lg font-bold text-white rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-300 hover:scale-[1.02] ${
      disabled
        ? "bg-gray-400 cursor-not-allowed"
        : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
    } ${className}`}
    disabled={disabled}
    onClick={onClick}
    {...props}
  >
    {children}
  </button>
);

ConnectButton.propTypes = {
  children: PropTypes.node,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
  className: PropTypes.string,
};

// FormInput: A flexible input component with enhanced disabled and error states
export const FormInput = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  disabled = false,
  className = "",
  ...props
}) => (
  <div className={`mb-4 ${className}`}>
    {label && (
      <label
        htmlFor={name}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
      </label>
    )}
    <input
      id={name}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 ${
        disabled
          ? "bg-gray-100 text-gray-500 cursor-not-allowed"
          : "bg-white/70 hover:bg-white/80 focus:bg-white/90"
      } ${
        error
          ? "border-red-300 focus:border-red-500 focus:ring-red-200"
          : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
      } focus:outline-none focus:ring-2 focus:ring-opacity-50`}
      {...props}
    />
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
);

FormInput.propTypes = {
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  type: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  error: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

// FormSelect: A select component with improved disabled and error states
export const FormSelect = ({
  label,
  name,
  options = [],
  value,
  onChange,
  error,
  disabled = false,
  className = "",
  ...props
}) => (
  <div className={`mb-4 ${className}`}>
    {label && (
      <label
        htmlFor={name}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
      </label>
    )}
    <select
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 ${
        disabled
          ? "bg-gray-100 text-gray-500 cursor-not-allowed"
          : "bg-white/70 hover:bg-white/80 focus:bg-white/90"
      } ${
        error
          ? "border-red-300 focus:border-red-500 focus:ring-red-200"
          : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
      } focus:outline-none focus:ring-2 focus:ring-opacity-50`}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
);

FormSelect.propTypes = {
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
  value: PropTypes.string,
  onChange: PropTypes.func,
  error: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

// Card: A customizable card component with shadow and border options
export const Card = ({
  children,
  className = "",
  shadow = "shadow-md",
  border = "border-gray-100",
  ...props
}) => (
  <div
    className={`bg-white rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg ${shadow} border ${border} ${className}`}
    {...props}
  >
    {children}
  </div>
);

Card.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  shadow: PropTypes.string,
  border: PropTypes.string,
};

// Button: A versatile button component with variant and size options
export const Button = ({
  children,
  variant = "primary",
  size = "medium",
  disabled = false,
  onClick,
  className = "",
  ...props
}) => {
  const baseClasses =
    "rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-50";

  const sizeClasses = {
    small: "px-3 py-1 text-sm",
    medium: "px-4 py-2",
    large: "px-6 py-3 text-lg",
  };

  const variantClasses = {
    primary: "bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-300",
    secondary:
      "bg-purple-500 hover:bg-purple-600 text-white focus:ring-purple-300",
    outlined:
      "border border-blue-500 text-blue-500 hover:bg-blue-50 focus:ring-blue-200",
    text: "text-blue-500 hover:bg-blue-50 focus:ring-blue-200",
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf(["primary", "secondary", "outlined", "text"]),
  size: PropTypes.oneOf(["small", "medium", "large"]),
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
  className: PropTypes.string,
};
