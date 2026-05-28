// client/src/components/ui/Modal.js
import React, { useEffect, useId, memo } from "react";
import PropTypes from "prop-types";
import { X } from "lucide-react";
import FocusTrap from "./FocusTrap.js";

const SIZE_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  className = "",
  ariaLabel,
  size = "md",
}) => {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-fg/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close dialog"
        tabIndex={-1}
      />
      <FocusTrap active={isOpen} onEscapeKey={onClose}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-label={!title ? ariaLabel || undefined : undefined}
          className={`relative bg-surface-raised border border-line rounded-token-lg shadow-soft-lg w-full m-4 ${SIZE_CLASSES[size] ?? ""} ${className}`.trim()}
        >
          {title && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <h2 id={titleId} className="text-lg font-semibold text-fg">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="text-fg-muted hover:text-fg rounded-md p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
          )}
          {children}
        </div>
      </FocusTrap>
    </div>
  );
};

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  ariaLabel: PropTypes.string,
  size: PropTypes.oneOf(["sm", "md", "lg", "xl"]),
};

export default memo(Modal);
