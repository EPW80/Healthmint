// src/components/StyledComponents.js
import React from "react";
import PropTypes from "prop-types";

/**
 * GlassContainer - A container with glass morphism effect
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child elements
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.rest - Other props to pass to the div
 */
export const GlassContainer = ({ children, className = "", ...props }) => (
  <div
    className={`bg-white/80 backdrop-blur-md rounded-3xl p-8 sm:p-10 w-full max-w-lg mx-auto shadow-xl border border-white/30 transition-all duration-300 hover:translate-y-[-5px] hover:shadow-2xl ${className}`}
    {...props}
  >
    {children}
  </div>
);

GlassContainer.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

/**
 * ConnectButton - A styled button for wallet connection and primary actions
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Button content
 * @param {boolean} props.disabled - Whether the button is disabled
 * @param {Function} props.onClick - Click handler
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.rest - Other props to pass to the button
 */
export const ConnectButton = ({
  children,
  disabled = false,
  onClick,
  className = "",
  ...props
}) => (
  <button
    className={`w-full py-4 px-6 text-lg font-bold text-white rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 shadow-md hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-300 hover:scale-[1.02] ${
      disabled ? "opacity-50 cursor-not-allowed" : ""
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

/**
 * FormInput - A styled input field with consistent styling
 *
 * @param {Object} props - Component props
 * @param {string} props.label - Input label
 * @param {string} props.name - Input name
 * @param {string} props.type - Input type
 * @param {string} props.value - Input value
 * @param {Function} props.onChange - Change handler
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.error - Error message
 * @param {boolean} props.disabled - Whether the input is disabled
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.rest - Other props to pass to the input
 */
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
      className={`w-full px-4 py-3 bg-white/70 hover:bg-white/80 focus:bg-white/90 rounded-xl border transition-all duration-200 ${
        error
          ? "border-red-300 focus:border-red-500 focus:ring-red-200"
          : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
      } focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
        disabled ? "opacity-60 cursor-not-allowed" : ""
      }`}
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

/**
 * FormSelect - A styled select dropdown
 *
 * @param {Object} props - Component props
 * @param {string} props.label - Select label
 * @param {string} props.name - Select name
 * @param {Array} props.options - Select options
 * @param {string} props.value - Select value
 * @param {Function} props.onChange - Change handler
 * @param {string} props.error - Error message
 * @param {boolean} props.disabled - Whether the select is disabled
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.rest - Other props to pass to the select
 */
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
      className={`w-full px-4 py-3 bg-white/70 hover:bg-white/80 focus:bg-white/90 rounded-xl border transition-all duration-200 ${
        error
          ? "border-red-300 focus:border-red-500 focus:ring-red-200"
          : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
      } focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
        disabled ? "opacity-60 cursor-not-allowed" : ""
      }`}
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

/**
 * Card - A styled card component with consistent styling
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Card content
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.rest - Other props to pass to the div
 */
export const Card = ({ children, className = "", ...props }) => (
  <div
    className={`bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg ${className}`}
    {...props}
  >
    {children}
  </div>
);

Card.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

/**
 * Button - A general purpose button with variants
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Button content
 * @param {string} props.variant - Button variant (primary, secondary, outlined, text)
 * @param {boolean} props.disabled - Whether the button is disabled
 * @param {Function} props.onClick - Click handler
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.rest - Other props to pass to the button
 */
export const Button = ({
  children,
  variant = "primary",
  disabled = false,
  onClick,
  className = "",
  ...props
}) => {
  const baseClasses =
    "px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-50";

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
      className={`${baseClasses} ${variantClasses[variant]} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
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
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
  className: PropTypes.string,
};
