import React, { useState, useCallback } from "react";
import PropTypes from "prop-types";
import { Copy, Check } from "lucide-react";

const HashDisplay = ({
  value,
  startChars = 6,
  endChars = 4,
  className = "",
}) => {
  const [copied, setCopied] = useState(false);

  const truncated = value
    ? `${value.slice(0, startChars)}…${value.slice(-endChars)}`
    : "";

  const handleCopy = useCallback(async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_err) {
      // clipboard unavailable — silent
    }
  }, [value]);

  if (!value) return null;

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span className="font-mono text-sm" aria-label={value} title={value}>
        {truncated}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Copied to clipboard" : `Copy ${value}`}
        className="p-0.5 rounded text-fg-subtle hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring transition-colors"
      >
        {copied ? (
          <Check size={12} aria-hidden="true" />
        ) : (
          <Copy size={12} aria-hidden="true" />
        )}
      </button>
    </span>
  );
};

HashDisplay.propTypes = {
  value: PropTypes.string,
  startChars: PropTypes.number,
  endChars: PropTypes.number,
  className: PropTypes.string,
};

export default HashDisplay;
