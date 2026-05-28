// client/src/components/ui/FormField.js
import React, { memo } from "react";
import PropTypes from "prop-types";

const FormField = ({
  label,
  id,
  required,
  error,
  hint,
  children,
  className,
}) => {
  const errorId = error ? `${id}-error` : undefined;
  const hintId  = hint  ? `${id}-hint`  : undefined;

  // A11y wiring: wire aria-invalid, aria-describedby, and error border class
  // onto whatever input/select/textarea is passed as children.
  const enhancedChild = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    return React.cloneElement(child, {
      id: child.props.id || id,
      "aria-invalid": error ? true : child.props["aria-invalid"],
      "aria-describedby":
        [child.props["aria-describedby"], errorId, hintId]
          .filter(Boolean)
          .join(" ") || undefined,
      className: [child.props.className, error && "border-danger"]
        .filter(Boolean)
        .join(" "),
    });
  });

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-fg mb-1">
          {label}
          {required && (
            <span className="text-danger ml-1" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {enhancedChild}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="mt-1 text-xs text-fg-muted">
          {hint}
        </p>
      )}
    </div>
  );
};

FormField.propTypes = {
  label:     PropTypes.string,
  id:        PropTypes.string.isRequired,
  required:  PropTypes.bool,
  error:     PropTypes.string,
  hint:      PropTypes.node,
  children:  PropTypes.node.isRequired,
  className: PropTypes.string,
};

export default memo(FormField);
