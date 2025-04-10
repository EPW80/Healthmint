// client/src/components/ui/FocusTrap.js
import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";

// FocusTrap: A component to trap focus within a specified area
// This is useful for modals, popups, or any interactive component
// that should restrict keyboard navigation to its contents.
const FocusTrap = ({
  children,
  active = true,
  returnFocusOnDeactivate = true,
  autoFocus = true,
  onEscapeKey = null,
}) => {
  const containerRef = useRef(null);
  const previouslyFocusedElement = useRef(null);

  // Record the previously focused element when activated
  useEffect(() => {
    if (active) {
      previouslyFocusedElement.current = document.activeElement;

      // Auto-focus the first focusable element in the container
      if (autoFocus && containerRef.current) {
        const focusableElements = getFocusableElements(containerRef.current);
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        } else {
          // If no focusable elements, focus the container itself
          containerRef.current.setAttribute("tabindex", "-1");
          containerRef.current.focus();
        }
      }
    } else if (returnFocusOnDeactivate && previouslyFocusedElement.current) {
      // Return focus when deactivated
      previouslyFocusedElement.current.focus();
    }
  }, [active, autoFocus, returnFocusOnDeactivate]);

  // Handle tab keypresses to trap focus
  useEffect(() => {
    if (!active || !containerRef.current) return;

    const handleKeyDown = (e) => {
      // Handle escape key if callback provided
      if (e.key === "Escape" && onEscapeKey) {
        onEscapeKey(e);
        return;
      }

      // Only handle tab key
      if (e.key !== "Tab") return;

      const focusableElements = getFocusableElements(containerRef.current);
      if (focusableElements.length === 0) return;

      // Get the first and last focusable elements
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Shift+Tab on first element should go to last element
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
      // Tab on last element should go to first element
      else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    // Add event listener for keydown
    document.addEventListener("keydown", handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [active, onEscapeKey]);

  // Utility function to get all focusable elements inside a container
  const getFocusableElements = (container) => {
    if (!container) return [];

    // Query for all focusable elements
    const focusableQuery = [
      "a[href]",
      "button:not([disabled])",
      "textarea:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
      "area[href]",
    ].join(",");

    return Array.from(container.querySelectorAll(focusableQuery)).filter(
      (el) => {
        // Further filter out hidden elements
        return el.offsetParent !== null; // Element is visible
      }
    );
  };

  return <div ref={containerRef}>{children}</div>;
};

FocusTrap.propTypes = {
  children: PropTypes.node.isRequired,
  active: PropTypes.bool,
  returnFocusOnDeactivate: PropTypes.bool,
  autoFocus: PropTypes.bool,
  onEscapeKey: PropTypes.func,
};

export default FocusTrap;
