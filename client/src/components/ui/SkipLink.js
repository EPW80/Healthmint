import React from "react";

const SkipLink = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-accent focus:text-accent-fg focus:px-4 focus:py-2 focus:rounded-token focus:text-sm focus:font-semibold focus:shadow-soft-md outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2"
  >
    Skip to main content
  </a>
);

export default SkipLink;
