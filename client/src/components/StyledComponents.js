// src/components/StyledComponents.js
import React from "react";
import PropTypes from "prop-types";
import LoadingSpinner from "./ui/LoadingSpinner.js";

// Card — token-driven surface with optional elevation and padding.
export const Card = ({
  children,
  className = "",
  elevation = "sm",
  padding = "none",
  ...props
}) => {
  const elevationClasses = {
    none: "",
    sm:   "shadow-soft-sm",
    md:   "shadow-soft-md",
    lg:   "shadow-soft-lg",
  };
  const paddingClasses = {
    none: "",
    sm:   "p-4",
    md:   "p-6",
    lg:   "p-8",
  };
  return (
    <div
      className={`bg-surface border border-line rounded-token ${elevationClasses[elevation] ?? ""} ${paddingClasses[padding] ?? ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

Card.propTypes = {
  children:  PropTypes.node,
  className: PropTypes.string,
  elevation: PropTypes.oneOf(["none", "sm", "md", "lg"]),
  padding:   PropTypes.oneOf(["none", "sm", "md", "lg"]),
};

const inputBase =
  "w-full px-3 py-2 rounded-token border bg-surface text-fg placeholder-fg-subtle shadow-sm transition-colors focus:outline-none disabled:bg-surface-raised disabled:text-fg-muted disabled:cursor-not-allowed";

const errorBorder   = "border-danger focus:border-danger focus:ring-1 focus:ring-danger";
const defaultBorder = "border-line focus:border-accent focus:ring-1 focus:ring-accent";

// FormInput — token-driven text input with label and error state.
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
      <label htmlFor={name} className="block text-sm font-medium text-fg mb-1">
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
      className={`${inputBase} ${error ? errorBorder : defaultBorder}`}
      {...props}
    />
    {error && <p className="mt-1 text-sm text-danger">{error}</p>}
  </div>
);

FormInput.propTypes = {
  label:       PropTypes.string,
  name:        PropTypes.string.isRequired,
  type:        PropTypes.string,
  value:       PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange:    PropTypes.func,
  placeholder: PropTypes.string,
  error:       PropTypes.string,
  disabled:    PropTypes.bool,
  className:   PropTypes.string,
};

// FormSelect — token-driven select with label and error state.
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
      <label htmlFor={name} className="block text-sm font-medium text-fg mb-1">
        {label}
      </label>
    )}
    <select
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`${inputBase} ${error ? errorBorder : defaultBorder}`}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    {error && <p className="mt-1 text-sm text-danger">{error}</p>}
  </div>
);

FormSelect.propTypes = {
  label:     PropTypes.string,
  name:      PropTypes.string.isRequired,
  options:   PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
  value:     PropTypes.string,
  onChange:  PropTypes.func,
  error:     PropTypes.string,
  disabled:  PropTypes.bool,
  className: PropTypes.string,
};

// Button — single unified action button. Token-driven variants, no inline spinner.
export const Button = ({
  children,
  variant   = "primary",
  size      = "medium",
  type      = "button",
  disabled  = false,
  loading   = false,
  fullWidth = false,
  onClick,
  className = "",
  ...props
}) => {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-token font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-page disabled:opacity-60 disabled:cursor-not-allowed";

  const sizes = {
    small:  "px-3 py-1.5 text-sm",
    medium: "px-4 py-2 text-sm",
    large:  "px-6 py-3 text-base",
  };

  const variants = {
    primary:   "bg-accent hover:bg-accent-hover text-accent-fg shadow-soft-sm",
    secondary: "bg-surface-raised hover:bg-surface text-fg border border-line-strong",
    danger:    "bg-danger hover:bg-danger/90 text-accent-fg shadow-soft-sm",
    outlined:  "border border-accent text-accent hover:bg-accent/10",
    ghost:     "border border-line text-fg hover:bg-surface",
    text:      "text-accent hover:bg-accent/10",
  };

  return (
    <button
      type={type}
      className={`${base} ${sizes[size] ?? sizes.medium} ${variants[variant] ?? variants.primary}${fullWidth ? " w-full" : ""} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <LoadingSpinner size="small" color="current" />}
      {children}
    </button>
  );
};

Button.propTypes = {
  children:  PropTypes.node,
  variant:   PropTypes.oneOf(["primary", "secondary", "danger", "outlined", "ghost", "text"]),
  size:      PropTypes.oneOf(["small", "medium", "large"]),
  type:      PropTypes.oneOf(["button", "submit", "reset"]),
  disabled:  PropTypes.bool,
  loading:   PropTypes.bool,
  fullWidth: PropTypes.bool,
  onClick:   PropTypes.func,
  className: PropTypes.string,
};
