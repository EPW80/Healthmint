// client/src/components/ui/Modal.js
import React, { useEffect, memo } from "react";
import PropTypes from "prop-types";
import FocusTrap from "./FocusTrap.js";

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  className = "",
  ariaLabel,
}) => {
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
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-modal="true"
      role="dialog"
      aria-label={ariaLabel || title}
    >
      <FocusTrap active={isOpen} onEscapeKey={onClose}>
        <div
          className={`bg-white rounded-xl shadow-xl w-full m-4 ${className}`}
        >
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
};

export default memo(Modal);
